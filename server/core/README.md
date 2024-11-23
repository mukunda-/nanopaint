## core

Model and business logic.

We have "repos" which are part of the data/persistence layer, and then the "services"
layer on top. These services are interfaces for API controllers. Other packages should not
interact with repositories directly.

Usage restrictions can be defined in the services layer, while the data/persistence layer
focuses on data storage and retrieval only.
