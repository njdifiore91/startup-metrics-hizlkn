import Joi from 'joi';

export const auditLogValidation = {
  getAuditLogs: {
    query: Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')),
      userId: Joi.string().uuid(),
      action: Joi.string(),
      entityType: Joi.string(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string()
        .valid('timestamp', 'action', 'entityType', 'userId')
        .default('timestamp'),
      sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
    }),
  },

  getAuditLogById: {
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }),
  },

  exportAuditLogs: {
    body: Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')),
      userId: Joi.string().uuid(),
      action: Joi.string(),
      entityType: Joi.string(),
    }),
  },

  getAuditLogStatistics: {
    query: Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')),
    }),
  },
};
