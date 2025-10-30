import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAuthFieldsToEmployee1730314800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email column
    await queryRunner.addColumn(
      'employees',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        isUnique: true,
        isNullable: false,
        default: "''",
      }),
    );

    // Add password column
    await queryRunner.addColumn(
      'employees',
      new TableColumn({
        name: 'password',
        type: 'varchar',
        isNullable: false,
        default: "''",
      }),
    );

    // Note: New enum values (ADMIN, CHEF_SERVICE, RH) will be handled by TypeORM synchronize
    // or added manually in production
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('employees', 'password');
    await queryRunner.dropColumn('employees', 'email');
    // Note: PostgreSQL doesn't support removing enum values, would need to recreate the enum
  }
}
