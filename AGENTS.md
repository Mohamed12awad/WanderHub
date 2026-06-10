## Review guidelines

- **Security First**: Verify that authentication and authorization middleware wrap every single exposed route or form action. Flag any raw queries or unsafe evaluations immediately.
- **Architectural Boundaries**: Maintain strict separation between business logic (services/use cases) and the transport/UI layers. Flag leaky abstractions.
- **Data Integrity**: Ensure all data mutations handle errors gracefully, implement defensive validation, and don't mutate state directly.
- **Performance**: Flag nested loops making asynchronous fetches, missing pagination on lists, or lack of proper caching on expensive operations.
- **Severity Filtering**: In automated PR reviews, only post inline comments for P0 and P1 issues to keep the signal-to-noise ratio high.
