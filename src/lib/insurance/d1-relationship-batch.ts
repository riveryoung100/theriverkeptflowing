import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";


export const INSURANCE_D1_RELATIONSHIP_BATCH_SIZE =
    100 as const;


export function chunkInsuranceD1RelationshipIds(
    relationshipIds:
        readonly RiverCrmRelationshipId[]
): readonly (
    readonly RiverCrmRelationshipId[]
)[] {
    const chunks:
        RiverCrmRelationshipId[][] = [];

    for(
        let offset = 0;
        offset < relationshipIds.length;
        offset +=
            INSURANCE_D1_RELATIONSHIP_BATCH_SIZE
    ){
        chunks.push(
            relationshipIds.slice(
                offset,
                offset +
                    INSURANCE_D1_RELATIONSHIP_BATCH_SIZE
            )
        );
    }

    return chunks;
}


export function compareInsuranceD1RelationshipIds(
    left:
        RiverCrmRelationshipId,
    right:
        RiverCrmRelationshipId
): number {
    if(left < right){
        return -1;
    }

    if(left > right){
        return 1;
    }

    return 0;
}
