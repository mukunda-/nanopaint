// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
package test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"reflect"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// Supertest-like request testing.

// ///////////////////////////////////////////////////////////////////////////////////////
type Request struct {
	T            *testing.T
	Base         string
	Method       string
	Path         string
	Headers      []string
	Result       any
	StatusCode   int
	Body         any
	Mpwriter     *multipart.Writer
	ResponseBody []byte
	Executed     bool
}

type fileToSend struct {
	Filename string
}

// ---------------------------------------------------------------------------------------
func MakeRequest(t *testing.T, base string) *Request {
	return &Request{
		T:    t,
		Base: base,
	}
}

// ---------------------------------------------------------------------------------------
func (r *Request) Req(method string, path string) *Request {
	r.Method = method
	r.Path = path
	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) Get(path string) *Request {
	r.Method = "GET"
	r.Path = path
	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) Post(path string) *Request {
	r.Method = "POST"
	r.Path = path
	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) Put(path string) *Request {
	r.Method = "PUT"
	r.Path = path
	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) Delete(path string) *Request {
	r.Method = "DELETE"
	r.Path = path
	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) Header(key string, value string) *Request {
	r.Headers = append(r.Headers, key+": "+value)
	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) headerIfNotSet(key string, value string) *Request {
	for _, header := range r.Headers {
		if strings.HasPrefix(strings.ToLower(header), strings.ToLower(key)+":") {
			return r
		}
	}
	return r.Header(key, value)
}

// ---------------------------------------------------------------------------------------
func (r *Request) Send(body any) *Request {
	r.Body = body
	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) SendFile(filename string) *Request {
	r.Body = fileToSend{filename}
	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) SendFormFile(fieldName, sourceFilePath string, filename ...string) *Request {
	if r.Mpwriter == nil {
		if r.Body != nil {
			panic("Body is already set with non multipart function.")
		}
		r.Body = &bytes.Buffer{}
		r.Mpwriter = multipart.NewWriter(r.Body.(*bytes.Buffer))
	}

	mpFilename := path.Base(sourceFilePath)
	if len(filename) > 0 {
		mpFilename = filename[0]
	}

	writer, err := r.Mpwriter.CreateFormFile(fieldName, mpFilename)
	assert.NoError(r.T, err)

	file, err := os.Open(sourceFilePath)
	assert.NoError(r.T, err)

	_, err = io.Copy(writer, file)
	assert.NoError(r.T, err)

	return r
}

// ---------------------------------------------------------------------------------------
func splitHeader(header string) (key string, value string) {
	parts := strings.SplitN(header, ": ", 2)
	return parts[0], parts[1]
}

// ---------------------------------------------------------------------------------------
func (r *Request) makeBodyReader() (io.Reader, string) {
	if r.Body == nil {
		return nil, ""
	}

	if r.Mpwriter != nil {
		r.Mpwriter.Close()
		return r.Body.(*bytes.Buffer), r.Mpwriter.FormDataContentType()
	}

	if v, ok := r.Body.([]byte); ok {
		return bytes.NewBuffer(v), "application/octet-stream"
	}

	if v, ok := r.Body.(fileToSend); ok {
		file, err := os.Open(v.Filename)
		assert.NoError(r.T, err)
		if err != nil {
			return nil, ""
		}
		return file, "application/octet-stream"
	}

	json, err := json.Marshal(r.Body)
	assert.NoError(r.T, err)
	if err != nil {
		return nil, ""
	}
	return bytes.NewBuffer(json), "application/json"
}

// ---------------------------------------------------------------------------------------
func (r *Request) Run() *Request {
	if r.Executed {
		return r
	}

	client := &http.Client{}
	requestBody, contentType := r.makeBodyReader()
	req, err := http.NewRequest(r.Method, r.Base+r.Path, requestBody)
	assert.NoError(r.T, err)

	if contentType != "" {
		r.headerIfNotSet("Content-Type", contentType)
	}

	for _, header := range r.Headers {
		key, value := splitHeader(header)
		req.Header.Set(key, value)
	}

	resp, err := client.Do(req)
	assert.NoError(r.T, err)
	r.StatusCode = resp.StatusCode

	body, err := io.ReadAll(resp.Body)
	assert.NoError(r.T, err)
	if len(body) > 2000 {
		r.T.Log("Received body:", string(body[:2000])+"...(truncated)")
	} else {
		r.T.Log("Received body:", string(body))
	}

	r.ResponseBody = body

	r.Executed = true
	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) Save(result any) *Request {
	rv := reflect.ValueOf(result).Elem()
	if rv.Kind() == reflect.Struct {
		err := json.Unmarshal(r.ResponseBody, result)
		assert.NoError(r.T, err)
		return r
	}

	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) RespMessage() string {
	var result struct {
		Message string
	}

	err := json.Unmarshal(r.ResponseBody, &result)
	assert.NoError(r.T, err)

	return result.Message
}

// ---------------------------------------------------------------------------------------
func (r *Request) Expect(status int, code string, msg ...string) *Request {
	r.Run()

	if status != 0 {
		assert.Equal(r.T, status, r.StatusCode)
	}

	exmsg := ""
	if len(msg) > 0 {
		exmsg = msg[0]
	}
	if code != "" || exmsg != "" {
		var result struct {
			Code    string
			Message string
		}

		err := json.Unmarshal(r.ResponseBody, &result)
		assert.NoError(r.T, err)

		if code != "" {
			assert.Equal(r.T, code, result.Code)
		}

		if exmsg != "" {
			assert.Regexp(r.T, exmsg, result.Message)
		}
	}

	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) ExpectSize(size int64) *Request {
	r.Run()

	assert.Equal(r.T, size, int64(len(r.ResponseBody)))

	return r
}

func (r *Request) ExpectData(data []byte) *Request {
	r.Run()

	assert.Equal(r.T, data, r.ResponseBody)

	return r
}

// ---------------------------------------------------------------------------------------
func (r *Request) Then(f func(r *Request)) *Request {
	r.Run()

	f(r)
	return r
}
