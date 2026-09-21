import type {
  PrincipalId,
} from "../identifiers";

import type {
  SeshCreatorId,
} from "../../sesh/identifiers";

import type {
  PrincipalSeshCreatorMapping,
} from "./creator-mapping";

export type PrincipalSeshCreatorMappingRepositoryErrorKind =
  | "not-found"
  | "validation"
  | "conflict"
  | "storage";

export type PrincipalSeshCreatorMappingRepositoryResult<T> =
  | {
      readonly ok:
        true;

      readonly value:
        T;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly kind:
          PrincipalSeshCreatorMappingRepositoryErrorKind;

        readonly message:
          string;
      };
    };

export interface PrincipalSeshCreatorMappingRepository {
  saveMapping(
    mapping:
      PrincipalSeshCreatorMapping,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<
      PrincipalSeshCreatorMapping
    >
  >;

  getByPrincipalId(
    principalId:
      PrincipalId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<
      PrincipalSeshCreatorMapping
    >
  >;

  getBySeshCreatorId(
    seshCreatorId:
      SeshCreatorId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<
      PrincipalSeshCreatorMapping
    >
  >;

  mappingExistsForPrincipal(
    principalId:
      PrincipalId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<boolean>
  >;

  mappingExistsForCreator(
    seshCreatorId:
      SeshCreatorId,
  ): Promise<
    PrincipalSeshCreatorMappingRepositoryResult<boolean>
  >;
}
