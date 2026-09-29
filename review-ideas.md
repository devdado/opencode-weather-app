# Weather CLI Review

- **Colors:** there is none; cyan needs to be defined (menu), yellow (temperature), green/red (ok/error).
- **Cities:** geocoding just fetch 1 result; ambiguous names may fail.
- **Tests:** there are none; at least test storage and API with mocks.
- **Binary:** let's compile right; let's check that `./dist/weather` stores data in `~/.weather-cli/`.
- **Scalability:** how easy is to extend functionality?
- **Load:** is there a load state for async tasks?
