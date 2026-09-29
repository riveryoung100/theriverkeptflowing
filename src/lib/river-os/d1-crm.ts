import {
    createRiverCrmRelationship
} from "./crm-workspace";

import type {
    RiverCrmCreatedAtCohortQuery,
    RiverCrmPersistence,
    RiverCrmRelationship,
    RiverCrmPipelineStage,
    RiverCrmRelationshipKind
} from "./crm-workspace";


interface RiverCrmRelationshipRow {
    relationship_id:
        unknown;

    display_name:
        unknown;

    kind:
        unknown;

    stage:
        unknown;

    source:
        unknown;

    email:
        unknown;

    phone:
        unknown;

    owner:
        unknown;

    next_follow_up_at:
        unknown;

    appointment_at:
        unknown;

    created_at:
        unknown;

    updated_at:
        unknown;
}


function requireString(
    value:
        unknown,
    field:
        string
): string {

    if (
        typeof value !== "string"
    ) {

        throw new TypeError(
            `River CRM persistence requires ${field} to be a string.`
        );

    }

    return value;

}


function optionalString(
    value:
        unknown,
    field:
        string
): string | undefined {

    if (
        value === null ||
        value === undefined
    ) {

        return undefined;

    }

    return requireString(
        value,
        field
    );

}


function rowToRelationship(
    row:
        RiverCrmRelationshipRow
): RiverCrmRelationship {

    return createRiverCrmRelationship({
        relationshipId:
            requireString(
                row.relationship_id,
                "relationship_id"
            ),

        displayName:
            requireString(
                row.display_name,
                "display_name"
            ),

        kind:
            requireString(
                row.kind,
                "kind"
            ) as RiverCrmRelationshipKind,

        stage:
            requireString(
                row.stage,
                "stage"
            ) as RiverCrmPipelineStage,

        source:
            requireString(
                row.source,
                "source"
            ),

        email:
            optionalString(
                row.email,
                "email"
            ),

        phone:
            optionalString(
                row.phone,
                "phone"
            ),

        owner:
            optionalString(
                row.owner,
                "owner"
            ),

        nextFollowUpAt:
            optionalString(
                row.next_follow_up_at,
                "next_follow_up_at"
            ),

        appointmentAt:
            optionalString(
                row.appointment_at,
                "appointment_at"
            ),

        createdAt:
            requireString(
                row.created_at,
                "created_at"
            ),

        updatedAt:
            requireString(
                row.updated_at,
                "updated_at"
            )
    });

}


function requireRelationshipId(
    relationshipId:
        unknown
): asserts relationshipId is string {

    if (
        typeof relationshipId !== "string" ||
        !relationshipId.startsWith(
            "relationship:"
        ) ||
        relationshipId.trim() !==
            relationshipId ||
        relationshipId.length <=
            "relationship:".length
    ) {

        throw new TypeError(
            "River CRM persistence requires a valid relationship identity."
        );

    }

}


function requireLimit(
    limit:
        number
): void {

    if (
        !Number.isInteger(
            limit
        ) ||
        limit <= 0 ||
        limit > 100
    ) {

        throw new TypeError(
            "River CRM list limit must be an integer from 1 through 100."
        );

    }

}


function requireCanonicalUtcTimestamp(
    value:
        unknown,
    field:
        string
): string {
    if(
        typeof value !== "string" ||
        value.trim() !== value
    ){
        throw new TypeError(
            `River CRM created-at cohort requires ${field} to be a canonical UTC ISO timestamp.`
        );
    }

    const parsed =
        new Date(
            value
        );

    if(
        Number.isNaN(
            parsed.getTime()
        ) ||
        parsed.toISOString() !== value
    ){
        throw new TypeError(
            `River CRM created-at cohort requires ${field} to be a canonical UTC ISO timestamp.`
        );
    }

    return value;
}


function requireCreatedAtCohortQuery(
    query:
        RiverCrmCreatedAtCohortQuery
): {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly limit:
        number;
} {
    if(
        typeof query !== "object" ||
        query === null
    ){
        throw new TypeError(
            "River CRM created-at cohort requires a query."
        );
    }

    const createdAtFromInclusive =
        requireCanonicalUtcTimestamp(
            query.createdAtFromInclusive,
            "createdAtFromInclusive"
        );

    const createdAtToExclusive =
        requireCanonicalUtcTimestamp(
            query.createdAtToExclusive,
            "createdAtToExclusive"
        );

    if(
        createdAtFromInclusive >=
        createdAtToExclusive
    ){
        throw new TypeError(
            "River CRM created-at cohort requires createdAtFromInclusive to be earlier than createdAtToExclusive."
        );
    }

    const limit =
        query.limit ??
        50;

    requireLimit(
        limit
    );

    return {
        createdAtFromInclusive,
        createdAtToExclusive,
        limit
    };
}


export interface D1RiverCrmCreatedAtCohortPersistence {
    listCreatedAtRange(
        query:
            RiverCrmCreatedAtCohortQuery
    ): Promise<
        readonly RiverCrmRelationship[]
    >;
}

export class D1RiverCrmPersistence
implements RiverCrmPersistence {

    public constructor(
        private readonly database:
            D1Database
    ) {}


    public async upsert(
        relationship:
            RiverCrmRelationship
    ): Promise<void> {

        const validated =
            createRiverCrmRelationship(
                relationship
            );

        await this.database
            .prepare(
                `
                    INSERT INTO river_crm_relationships (
                        relationship_id,
                        display_name,
                        kind,
                        stage,
                        source,
                        email,
                        phone,
                        owner,
                        next_follow_up_at,
                        appointment_at,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        ?1, ?2, ?3, ?4, ?5, ?6,
                        ?7, ?8, ?9, ?10, ?11, ?12
                    )
                    ON CONFLICT(relationship_id)
                    DO UPDATE SET
                        display_name = excluded.display_name,
                        kind = excluded.kind,
                        stage = excluded.stage,
                        source = excluded.source,
                        email = excluded.email,
                        phone = excluded.phone,
                        owner = excluded.owner,
                        next_follow_up_at = excluded.next_follow_up_at,
                        appointment_at = excluded.appointment_at,
                        updated_at = excluded.updated_at
                `
            )
            .bind(
                validated.relationshipId,
                validated.displayName,
                validated.kind,
                validated.stage,
                validated.source,
                validated.email ?? null,
                validated.phone ?? null,
                validated.owner ?? null,
                validated.nextFollowUpAt ?? null,
                validated.appointmentAt ?? null,
                validated.createdAt,
                validated.updatedAt
            )
            .run();

    }


    public async get(
        relationshipId:
            string
    ): Promise<RiverCrmRelationship | undefined> {

        requireRelationshipId(
            relationshipId
        );

        const row =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM river_crm_relationships
                        WHERE relationship_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    relationshipId
                )
                .first<RiverCrmRelationshipRow>();

        return row === null
            ? undefined
            : rowToRelationship(
                row
            );

    }


    public async list(
        limit:
            number = 50
    ): Promise<readonly RiverCrmRelationship[]> {

        requireLimit(
            limit
        );

        const result =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM river_crm_relationships
                        ORDER BY updated_at DESC, relationship_id ASC
                        LIMIT ?1
                    `
                )
                .bind(
                    limit
                )
                .all<RiverCrmRelationshipRow>();

        return result.results.map(
            rowToRelationship
        );

    }


    public async listCreatedAtRange(
        query:
            RiverCrmCreatedAtCohortQuery
    ): Promise<readonly RiverCrmRelationship[]> {

        const validated =
            requireCreatedAtCohortQuery(
                query
            );

        const result =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM river_crm_relationships
                        WHERE created_at >= ?1
                          AND created_at < ?2
                        ORDER BY created_at DESC, relationship_id ASC
                        LIMIT ?3
                    `
                )
                .bind(
                    validated.createdAtFromInclusive,
                    validated.createdAtToExclusive,
                    validated.limit
                )
                .all<RiverCrmRelationshipRow>();

        return result.results.map(
            rowToRelationship
        );

    }

}


export function createD1RiverCrmPersistence(
    database:
        D1Database
): RiverCrmPersistence &
    D1RiverCrmCreatedAtCohortPersistence {

    return new D1RiverCrmPersistence(
        database
    );

}
