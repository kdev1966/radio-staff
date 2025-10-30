import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShiftPositions1730290000000 implements MigrationInterface {
    name = 'AddShiftPositions1730290000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Ajouter la colonne day_type dans shifts
        await queryRunner.query(`
            ALTER TABLE "shifts"
            ADD COLUMN "day_type" character varying NOT NULL DEFAULT 'NORMAL'
        `);

        // Créer la table shift_positions
        await queryRunner.query(`
            CREATE TABLE "shift_positions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "shift_id" uuid NOT NULL,
                "position_name" character varying NOT NULL,
                "needed" integer NOT NULL,
                "required_role" character varying NOT NULL,
                CONSTRAINT "PK_shift_positions" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_shift_positions_shift_position" UNIQUE ("shift_id", "position_name"),
                CONSTRAINT "FK_shift_positions_shift" FOREIGN KEY ("shift_id")
                    REFERENCES "shifts"("id") ON DELETE CASCADE
            )
        `);

        // Ajouter la colonne position_id dans shift_assignments
        await queryRunner.query(`
            ALTER TABLE "shift_assignments"
            ADD COLUMN "position_id" uuid
        `);

        // Ajouter la contrainte de clé étrangère pour position_id
        await queryRunner.query(`
            ALTER TABLE "shift_assignments"
            ADD CONSTRAINT "FK_shift_assignments_position"
            FOREIGN KEY ("position_id") REFERENCES "shift_positions"("id")
            ON DELETE SET NULL
        `);

        // Créer des index pour améliorer les performances
        await queryRunner.query(`
            CREATE INDEX "IDX_shift_positions_shift_id" ON "shift_positions" ("shift_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_shift_assignments_position_id" ON "shift_assignments" ("position_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_shifts_day_type" ON "shifts" ("day_type")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Supprimer les index
        await queryRunner.query(`DROP INDEX "IDX_shifts_day_type"`);
        await queryRunner.query(`DROP INDEX "IDX_shift_assignments_position_id"`);
        await queryRunner.query(`DROP INDEX "IDX_shift_positions_shift_id"`);

        // Supprimer la contrainte FK
        await queryRunner.query(`
            ALTER TABLE "shift_assignments"
            DROP CONSTRAINT "FK_shift_assignments_position"
        `);

        // Supprimer la colonne position_id
        await queryRunner.query(`
            ALTER TABLE "shift_assignments"
            DROP COLUMN "position_id"
        `);

        // Supprimer la table shift_positions
        await queryRunner.query(`DROP TABLE "shift_positions"`);

        // Supprimer la colonne day_type
        await queryRunner.query(`
            ALTER TABLE "shifts"
            DROP COLUMN "day_type"
        `);
    }
}
