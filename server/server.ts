import { Application, Router, send, Context } from 'https://deno.land/x/oak@v7.5.0/mod.ts'
import {
	viewEngine,
	engineFactory,
	adapterFactory,
  } from 'https://deno.land/x/view_engine@v1.5.0/mod.ts'
import {
	WebSocketClient,
	WebSocketServer,
} from 'https://deno.land/x/websocket@v0.1.1/mod.ts'
import { handleWsMessage } from './handleWsMessage.ts'

const app = new Application()

//Websocket
const wss = new WebSocketServer(3000)

//template engine (ejs)
const viewConfig = {
	viewRoot: './views',
	useCache: false
}
app.use(viewEngine(adapterFactory.getOakAdapter(), engineFactory.getEjsEngine(), viewConfig))

//Middleware
const router = new Router()
app.use(router.routes())
app.use(router.allowedMethods())

app.use(async (ctx: Context, next: () => void) => {
	//Resolve static files
	await send(ctx, ctx.request.url.pathname, {
		root: `${Deno.cwd()}/public`,
	})
	next()
})

//Routes
//deno-lint-ignore no-explicit-any
router.get('/', (ctx: any) => {
	ctx.render('index.ejs')
})

//deno-lint-ignore no-explicit-any
router.get('/gene', (ctx: any) => {
	ctx.render('gene.ejs')
})

const server = async (port: number) => {
	await app.listen({ port: port })
	console.log(`Server run on http://localhost:${port}/`)
}

//ws communication
wss.on('connection', (ws: WebSocketClient) => {
	ws.on('message', async (message: string) => {
		const result = await handleWsMessage(message)
		if (result !== undefined) ws.send(result)
	})
})

export { server }
