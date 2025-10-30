import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1698000000000 implements MigrationInterface {
    name = 'InitialSchema1698000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create employees table
        await queryRunner.query(`
            CREATE TABLE "employees" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "matricule" character varying NOT NULL,
                "first_name" character varying NOT NULL,
                "last_name" character varying NOT NULL,
                "birth_date" date NOT NULL,
                "phone" character varying NOT NULL,
                "role" character varying NOT NULL,
                "address" character varying NOT NULL,
                "keycloak_id" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_employees_matricule" UNIQUE ("matricule"),
                CONSTRAINT "UQ_employees_keycloak_id" UNIQUE ("keycloak_id"),
                CONSTRAINT "PK_employees" PRIMARY KEY ("id")
            )
        `);

        // Create leave_requests table
        await queryRunner.query(`
            CREATE TABLE "leave_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "employee_id" uuid NOT NULL,
                "start_date" date NOT NULL,
                "end_date" date NOT NULL,
                "days" numeric(3,1) NOT NULL,
                "type" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'PENDING',
                "requested_at" TIMESTAMP NOT NULL DEFAULT now(),
                "manager_approved_at" TIMESTAMP,
                "manager_approved_by" character varying,
                "hr_approved_at" TIMESTAMP,
                "hr_approved_by" character varying,
                "rejected_at" TIMESTAMP,
                "rejected_by" character varying,
                "rejection_reason" character varying,
                CONSTRAINT "PK_leave_requests" PRIMARY KEY ("id"),
                CONSTRAINT "FK_leave_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE
            )
        `);

        // Create shifts table
        await queryRunner.query(`
            CREATE TABLE "shifts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "shift_date" date NOT NULL,
                "period" character varying NOT NULL,
                "start_time" time NOT NULL,
                "end_time" time NOT NULL,
                "needed" integer NOT NULL DEFAULT 1,
                CONSTRAINT "UQ_shifts_date_period" UNIQUE ("shift_date", "period"),
                CONSTRAINT "PK_shifts" PRIMARY KEY ("id")
            )
        `);

        // Create shift_assignments table
        await queryRunner.query(`
            CREATE TABLE "shift_assignments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "shift_id" uuid NOT NULL,
                "employee_id" uuid NOT NULL,
                "assigned_at" TIMESTAMP NOT NULL DEFAULT now(),
                "assigned_by" character varying,
                CONSTRAINT "UQ_shift_assignments" UNIQUE ("shift_id", "employee_id"),
                CONSTRAINT "PK_shift_assignments" PRIMARY KEY ("id"),
                CONSTRAINT "FK_shift_assignments_shift" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_shift_assignments_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE
            )
        `);

        // Create audit_logs table
        await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "action" character varying NOT NULL,
                "entity_type" character varying NOT NULL,
                "entity_id" character varying,
                "user_id" uuid,
                "username" character varying,
                "method" character varying,
                "endpoint" character varying,
                "status_code" integer,
                "duration" integer,
                "request_body" jsonb,
                "response_body" jsonb,
                "error_message" character varying,
                "details" jsonb,
                "ip_address" character varying,
                "user_agent" character varying,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
                CONSTRAINT "FK_audit_logs_employee" FOREIGN KEY ("user_id") REFERENCES "employees"("id") ON DELETE SET NULL
            )
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_status_code" ON "audit_logs" ("status_code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_audit_logs_status_code"`);
        await queryRunner.query(`DROP INDEX "IDX_audit_logs_timestamp"`);
        await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
        await queryRunner.query(`DROP INDEX "IDX_audit_logs_user_id"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "shift_assignments"`);
        await queryRunner.query(`DROP TABLE "shifts"`);
        await queryRunner.query(`DROP TABLE "leave_requests"`);
        await queryRunner.query(`DROP TABLE "employees"`);
    }
}
