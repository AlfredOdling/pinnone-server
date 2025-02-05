import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import router from './routes'

const app = express()
const port = process.env.PORT || 3001
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' }))

app.use((req, res, next) => {
  req.setTimeout(240000) // Set timeout to 120 seconds
  next()
})

app.use(
  (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    if (req.originalUrl === '/webhook') {
      /*
       * Skip bodyParser.json() for "/webhook" so that we can
       * get the raw body for stripe webhooks
       */
      next()
    } else {
      bodyParser.json()(req, res, next)
    }
  }
)

// Ensure express.raw is applied specifically for the /webhook route
app.use('/webhook', express.raw({ type: 'application/json' }))

app.use('/', router)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
