import type { FastifyInstance } from 'fastify'
import type { Db } from '../db.js'

export async function registerSessionRoutes(app: FastifyInstance, db: Db) {
  app.get('/sessions', async (req) => {
    const { date } = req.query as { date?: string }
    let sql = 'SELECT * FROM sessions'
    const params: unknown[] = []
    if (date) {
      const start = new Date(date).setHours(0, 0, 0, 0)
      const end = new Date(date).setHours(23, 59, 59, 999)
      sql += ' WHERE started_at BETWEEN ? AND ?'
      params.push(start, end)
    }
    sql += ' ORDER BY started_at DESC'
    return db.prepare(sql).all(...params)
  })
}
