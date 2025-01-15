import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import router from './routes'

const app = express()
const port = process.env.PORT || 3001
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' }))

app.use(
  (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    if (req.originalUrl === '/webhook') {
      next()
    } else {
      bodyParser.json()(req, res, next)
    }
  }
)

app.use('/', router)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
