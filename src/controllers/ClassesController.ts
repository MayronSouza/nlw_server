import { Request, Response } from 'express'

import db from '../database/connection'
import convertHourToMinutes from '../utils/convertHourToMinutes'

// Criando a interface para facilitar a manipulação do scheduleItem
interface ScheduleItem {
week_day: number,
from: string,
to: string,
}

export default class ClassesController {

  // Listagem de aulas
  async index(req: Request, res: Response) {
    const filters = req.query // Recebe a requisição com as query params 

    // Tipífica as propriedades para facilitar para o Typescript
    const subject = filters.subject as string
    const week_day = filters.week_day as string
    const time = filters.time as string

    // Filtra os dados da aula
    if (!filters.week_day || !filters.subject || !filters.time) {
      return res.status(400).json({
        error: 'Missing filters to search classes.'
      })
    }

    const hourInMinutes = convertHourToMinutes(time)

    // Monta a query para o DB
    const classes = await db('classes')
      .whereExists(function() { // Subquery juntamento com a table class_schedule
        this.select('class_schedule.*')
          .from('class_schedule')
          this.whereRaw('`class_schedule`.`class_id` = `classes`.`id`')
          this.whereRaw('`class_schedule`.`week_day` = ??', [Number(week_day)])
          this.whereRaw('`class_schedule`.`from` <= ??', [hourInMinutes])
          this.whereRaw('`class_schedule`.`to` > ??', [hourInMinutes])
      })
      .where('classes.subject', '=', subject)
      .join('users', 'classes.user_id', '=', 'users.id')
      .select(['classes.*', 'users.*'])

      console.log('Classes => ', classes)
      console.log('Horas => ', hourInMinutes)
  
    return res.json(classes)
  }

  async create(req: Request, res: Response) {
    const {
      name,
      avatar,
      whatsapp,
      bio,
      subject,
      cost,
      schedule,
    } = req.body
  
    const trx = await db.transaction()
  
    try {
      const insertedUsersIds = await trx('users').insert({
        name,
        avatar,
        whatsapp,
        bio,
      })
    
      const user_id = insertedUsersIds[0]
    
      const insertedClassesIds = await trx('classes').insert({
        subject,
        cost,
        user_id
      })
    
      const class_id = insertedClassesIds[0]
    
      const classSchedule = schedule.map((scheduleItem: ScheduleItem) => {
        return {
          class_id,
          week_day: scheduleItem.week_day,
          from: convertHourToMinutes(scheduleItem.from),
          to: convertHourToMinutes(scheduleItem.to),
        }
      })
    
      await trx('class_schedule').insert(classSchedule)
  
      await trx.commit()
    
      return res.status(201).send()
    } catch (err) {
      trx.rollback()
      return res.status(400).json({
        error: 'Unexpected error while creating new class.'
      })
    }
  
  }
}