const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Collaborative Kanban Board API',
      version: '1.0.0',
      description: `
# Collaborative Kanban Board REST API

A production-ready REST API for managing collaborative kanban boards with workspaces, tasks, and real-time dashboard insights.

## Features
- **JWT Authentication** – Register, login, and secure all endpoints
- **Workspace Management** – Create workspaces, invite members via unique codes
- **Task Management** – Full CRUD with status, priority, assignee, due dates, and labels
- **Search & Filters** – Search by title, filter by status/priority/assignee, sort by date
- **Dashboard** – Task statistics, overdue counts, priority distribution

## Authentication
All protected endpoints require a \`Bearer\` token in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`
      `,
      contact: {
        name: 'Kanban Board API Support',
        email: 'support@kanbanboard.dev',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description:
          process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token. Example: **Bearer eyJhbGci...**',
        },
      },
      schemas: {
        // ── User ──────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64a1b2c3d4e5f6789abcdef0' },
            name: { type: 'string', example: 'Alice Johnson' },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            avatar: { type: 'string', example: '' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'Alice Johnson',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'alice@example.com',
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'secret123',
              description: 'Must be at least 6 characters and contain a number',
            },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            password: { type: 'string', example: 'secret123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful.' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
        },

        // ── Workspace ─────────────────────────────────────────────
        WorkspaceMember: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            role: {
              type: 'string',
              enum: ['owner', 'admin', 'member'],
              example: 'member',
            },
            joinedAt: { type: 'string', format: 'date-time' },
          },
        },
        Workspace: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64a1b2c3d4e5f6789abcdef1' },
            name: { type: 'string', example: 'Product Team' },
            description: {
              type: 'string',
              example: 'Workspace for product development',
            },
            inviteCode: { type: 'string', example: 'ABC1234567' },
            owner: { $ref: '#/components/schemas/User' },
            members: {
              type: 'array',
              items: { $ref: '#/components/schemas/WorkspaceMember' },
            },
            memberCount: { type: 'integer', example: 3 },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateWorkspaceInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'Product Team',
            },
            description: {
              type: 'string',
              maxLength: 500,
              example: 'Workspace for product development',
            },
          },
        },

        // ── Task ─────────────────────────────────────────────────
        Task: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64a1b2c3d4e5f6789abcdef2' },
            title: { type: 'string', example: 'Design login screen' },
            description: {
              type: 'string',
              example: 'Create wireframes and final designs',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'review', 'done'],
              example: 'todo',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              example: 'high',
            },
            assignee: {
              oneOf: [
                { $ref: '#/components/schemas/User' },
                { type: 'null' },
              ],
            },
            workspace: { type: 'string', example: '64a1b2c3d4e5f6789abcdef1' },
            createdBy: { $ref: '#/components/schemas/User' },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-12-31T00:00:00.000Z',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              example: ['design', 'ui'],
            },
            order: { type: 'integer', example: 0 },
            isOverdue: { type: 'boolean', example: false },
            isArchived: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTaskInput: {
          type: 'object',
          required: ['title', 'workspaceId'],
          properties: {
            title: {
              type: 'string',
              minLength: 2,
              maxLength: 200,
              example: 'Design login screen',
            },
            description: {
              type: 'string',
              maxLength: 2000,
              example: 'Create wireframes and final designs',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'review', 'done'],
              default: 'todo',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              default: 'medium',
            },
            workspaceId: {
              type: 'string',
              example: '64a1b2c3d4e5f6789abcdef1',
            },
            assignee: {
              type: 'string',
              nullable: true,
              example: '64a1b2c3d4e5f6789abcdef0',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-12-31T00:00:00.000Z',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              example: ['design', 'ui'],
            },
          },
        },
        UpdateTaskInput: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'review', 'done'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            assignee: { type: 'string', nullable: true },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
            },
            order: { type: 'integer' },
          },
        },

        // ── Dashboard ─────────────────────────────────────────────
        TasksByStatus: {
          type: 'object',
          properties: {
            todo: { type: 'integer', example: 5 },
            in_progress: { type: 'integer', example: 3 },
            review: { type: 'integer', example: 2 },
            done: { type: 'integer', example: 10 },
          },
        },
        TasksByPriority: {
          type: 'object',
          properties: {
            low: { type: 'integer', example: 4 },
            medium: { type: 'integer', example: 8 },
            high: { type: 'integer', example: 5 },
            urgent: { type: 'integer', example: 3 },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalTasks: { type: 'integer', example: 20 },
            tasksByStatus: { $ref: '#/components/schemas/TasksByStatus' },
            tasksByPriority: { $ref: '#/components/schemas/TasksByPriority' },
            overdueTasks: { type: 'integer', example: 2 },
            myTasksCount: { type: 'integer', example: 7 },
            recentTasks: {
              type: 'array',
              items: { $ref: '#/components/schemas/Task' },
            },
          },
        },

        // ── Pagination ────────────────────────────────────────────
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            pages: { type: 'integer', example: 5 },
          },
        },

        // ── Error ─────────────────────────────────────────────────
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'An error occurred.' },
          },
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: {
                    type: 'string',
                    example: 'Please provide a valid email',
                  },
                },
              },
            },
          },
        },
      },

      // ── Reusable Responses ──────────────────────────────────────
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Not authorized. No token provided.',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Access denied – insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Access denied. You are not a member of this workspace.',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Task not found.' },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
            },
          },
        },
        ConflictError: {
          description: 'Resource already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'A user with this email already exists.',
              },
            },
          },
        },
        BadRequestError: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Internal Server Error' },
            },
          },
        },
      },
    },

    // Apply bearer auth globally to all operations
    security: [{ bearerAuth: [] }],
  },

  // Scan these files for JSDoc @swagger annotations
  apis: [
    './src/routes/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
