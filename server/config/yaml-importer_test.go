package config

/*
func TestYamlImport(t *testing.T) {
	ImportYamlContent([]byte(`
test1_a: a #comment
test1_b: "b" #comment
test1_c: 3 #comment
test1_d: 4.0 #comment
test1_e: true #comment
test1_e2: Yes # Yaml 1.1 boolean, but we use a 1.2 compliant parser, so this is a string.
test1_f:
   test1_a: aa
   #comment
   test1_b: "bb"
   #comment
   test1_c: 33
`))

	assert.Equal(t, "a", Get("test1_a"))
	assert.Equal(t, "b", Get("test1_b"))
	assert.Equal(t, "3", Get("test1_c"))
	assert.Equal(t, "4", Get("test1_d"))
	assert.Equal(t, "true", Get("test1_e"))
	assert.Equal(t, "Yes", Get("test1_e2"))
	assert.Equal(t, "aa", Get("test1_f.test1_a"))
	assert.Equal(t, "bb", Get("test1_f.test1_b"))
	assert.Equal(t, "33", Get("test1_f.test1_c"))

}
*/
