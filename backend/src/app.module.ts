import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.NODE_ENV === 'production' ? 'postgres' : 'localhost',
      port: 5432,
      username: 'radio',
      password: 'radiopass',
      database: 'radiodb',
      synchronize: true,
      entities: [],
    }),
  ],
})
export class AppModule {}