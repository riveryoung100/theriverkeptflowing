import {
  parseSeshAudioAssetId,
  parseSeshMusicProjectId,
  type SeshAudioAssetId,
  type SeshMusicProjectId,
} from "../../identifiers";

import type {
  SeshStorageReference,
} from "../../model";

function localIdentifier(
  value:
    string,

  prefix:
    string,
): string {
  return value.slice(
    prefix.length,
  );
}

export function createPrivateSeshAudioStorageReference(
  projectIdInput:
    SeshMusicProjectId,

  audioAssetIdInput:
    SeshAudioAssetId,
): SeshStorageReference {
  const projectId =
    parseSeshMusicProjectId(
      projectIdInput,
    );

  const audioAssetId =
    parseSeshAudioAssetId(
      audioAssetIdInput,
    );

  const projectLocal =
    encodeURIComponent(
      localIdentifier(
        projectId,
        "sesh-project:",
      ),
    );

  const audioLocal =
    encodeURIComponent(
      localIdentifier(
        audioAssetId,
        "sesh-audio:",
      ),
    );

  return {
    provider:
      "r2",

    key:
      `sesh/projects/${projectLocal}/audio/${audioLocal}/source.wav`,
  };
}
