const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const WS = require('ws');
const mongoose = require('mongoose')


const app = new Koa();

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

const router = new Router();
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });
let delUser;

wsServer.on('connection', (ws, req) => {

  ws.on('message', async (msg) => {
    const message = JSON.parse(msg);
    if (message.type === 'addUser') {
      const user = await User.getByName(message.user);
      if (!user) {
        const newUser = new User(message.user);
        await newUser.save();
        const users = await User.getAll();
        [...wsServer.clients]
          .filter(elem => elem.readyState === WS.OPEN)
          .forEach(elem => elem.send(JSON.stringify({ type: 'allUsers', data: users })));
        return
      }
      ws.send(JSON.stringify({ type: 'error', text: 'There`s already such a user name' }));
      return
    } else if (message.type === 'deleteUser') {
      delUser = message.user;
      await User.deleteUser(delUser);
      const users = await User.getAll();
      [...wsServer.clients]
        .filter(elem => elem.readyState === WS.OPEN)
        .forEach(elem => elem.send(JSON.stringify({ type: 'allUsers', data: users })));

    } else if (message.type === 'addMessage') {
      [...wsServer.clients]
        .filter(elem => elem.readyState === WS.OPEN)
        .forEach(elem => elem.send(JSON.stringify({ type: 'addMessage', data: message })));
    }
  });

  ws.on("close", () => {
    console.log("closed chat");
    [...wsServer.clients]
      .filter(elem => elem.readyState === WS.OPEN)
      .forEach(elem => elem.send(JSON.stringify({ type: 'disconnect', data: `${delUser} disconnected` })));
    ws.close();
  });


  [...wsServer.clients]
    .filter(elem => elem.readyState === WS.OPEN)
    .forEach(elem => elem.send(JSON.stringify({ type: 'connect', data: "new user connected" })));
});
app.use(router.routes()).use(router.allowedMethods());

const start = async () => {
  try{
    const url = 'mongodb+srv://Andrew:arF5vQFnnT12KkLT@cluster0.yrthm.mongodb.net/organizer';
    await mongoose.connect(url, {useNewUrlParser: true, useFindAndModify: false});
    const port = process.env.PORT || 7070;
    server.listen(port);
  }catch (e) {
    console.log(e)
  }
}

start();
