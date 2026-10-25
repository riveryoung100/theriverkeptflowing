# FOOD-031 targeted CLI integration

Provides a private write-once adapter to the pre-existing `food-first-batch.ts` engine; no existing engine was replaced.

Run `node --import tsx scripts/food/operating-system.ts first-batch --help`.

Initialize from a real private workbench (`.river-dev/state/...json`):

```powershell
node --import tsx scripts/food/operating-system.ts first-batch init .river-dev/state/YOUR-workbench.json A trial:southwest-A .river-dev/state/trial-A-v1.json
node --import tsx scripts/food/operating-system.ts first-batch report .river-dev/state/YOUR-workbench.json .river-dev/state/trial-A-v1.json
node --import tsx scripts/food/operating-system.ts first-batch template weigh .river-dev/state/weigh-blank.json
```

Enter genuine values in a **new copy** of the blank payload, set `status` to `OWNER_ENTERED_UNVERIFIED`, then append to a brand-new history file with an explicit expected revision. The canonical engine validates all fields.

```powershell
node --import tsx scripts/food/operating-system.ts first-batch append .river-dev/state/YOUR-workbench.json .river-dev/state/trial-A-v1.json weigh .river-dev/state/weigh-entered.json .river-dev/state/trial-A-v2.json 1
```

Never overwrite history or portray trial observations as food-safety, legal, supplier, or launch approval.
