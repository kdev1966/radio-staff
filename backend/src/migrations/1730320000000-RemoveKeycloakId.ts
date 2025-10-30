import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveKeycloakId1730320000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove keycloak_id column from employees table
    await queryRunner.dropColumn('employees', 'keycloak_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add keycloak_id column if we need to rollback
    await queryRunner.addColumn(
      'employees',
      new TableColumn({
        name: 'keycloak_id',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
