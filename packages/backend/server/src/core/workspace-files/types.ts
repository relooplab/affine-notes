import { Field, ObjectType } from '@nestjs/graphql';
import { SafeIntResolver } from 'graphql-scalars';

/**
 * GraphQL representation of a workspace file.
 */
@ObjectType()
export class WorkspaceFileType {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  mime!: string;

  @Field(() => SafeIntResolver)
  size!: number;

  @Field({ nullable: true })
  parentId!: string | null;

  @Field()
  isFolder!: boolean;

  @Field()
  url!: string;

  @Field()
  createdAt!: Date;

  @Field()
  createdBy!: string;
}