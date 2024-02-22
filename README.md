### Tech stack for Backend
- Node.js
- express 4.17.1

### Others
- MariaDB 10.4.13

### For Development
1. NPM Install
```bash
$ npm i
```
2. Set .env in root directory
```bash
DB_HOST=xxx.xxx.xxx.xxx
DB_PORT=xxxx
DB_USER=xxxxxxx
DB_PASSWORD=xxxxxxxxxxxxx
DB_DATABASE=xxxxxx
JWT_SECRET=xxxxxxxxxxxxx
INFLUX_DB_HOST=xxx.xxx.xxx.xxx
INFLUX_DB_PORT=xxxx
INFLUX_DB_DATABASE=xxxxxxx
SOCKET_FE_HOST=localhost:3000
SOCKET_BE_HOST=localhost:5000
```
3. Run as dev
```bash
$ npm run dev
```

4. node version
v16.16.0