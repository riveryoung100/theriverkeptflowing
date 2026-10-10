# Creation and food-business shared foundations

## Status and authority

Recorded October 4, 2026 from River Young's Creation Platform Workflow Handoff and Food Business and Community Meals Implementation Handoff. Both are current additive directions. Neither supersedes the other or replaces existing insurance, Sesh, commerce, content, Cloudflare, River OS, or development-agent work. This is a planning record, not proof of implemented features or permission to activate them.

The bounded direction records are [CREATION-001](../../.river-dev/specifications/creation-001-additive-creation-platform-direction.json) and [FOOD-001](../../.river-dev/specifications/food-001-additive-food-business-draft-domain-direction.json), coordinated by the [shared plan](../../.river-dev/plans/creation-food-001-additive-direction-plan.json). The pasted handoffs are the source; this note summarizes their implementation direction rather than claiming to reproduce every operational detail. No separate creator handoff file was found during reconciliation.

## Observed foundations and reuse boundaries

| Area | Repository evidence | Reuse opportunity and unresolved boundary |
|---|---|---|
| Hosting | `astro.config.mjs`, `wrangler.jsonc`, `package.json` | Preserve Astro and Cloudflare publishing. Configured D1/R2 bindings do not prove live migrations, secret availability, or production readiness. No hosting move or duplicate site. |
| Identity | `src/lib/identity/`, principal sessions and Sesh creator mapping | Reuse identity/session patterns. Commerce customer references are not automatically principal identities; define mappings explicitly before integration. |
| Permissions | `src/lib/river-os/access.ts`, `src/lib/sesh/authorization/` | Reuse private-workspace and project-ownership patterns. River OS access-key sessions do not establish granular staff roles. Keep server-side authorization and publication authority separate. |
| Projects and storage | `src/lib/sesh/model.ts`, `src/lib/sesh/persistence/cloudflare/` | Reuse ownership, version/reference and D1/R2 adapter patterns. Music-specific projects and audio contracts must not be silently redefined as general video storage. Private receipts and operational evidence need protected storage, not public content directories. |
| Content and media | `src/lib/assimilation/ingestion/`, `src/lib/river-os/content-catalog.ts`, `src/lib/river-os/content-repurpose-planner.ts` | Preserve source/transcript lineage and reuse food-video/content links. Repurpose plans do not render films or shorts. One shared creator workflow should serve food content, rather than building a second editor. |
| AI and orchestration | `src/lib/knowledge/semantic/model-provider.ts`, `src/lib/orchestration/` | Reuse provider isolation and deterministic orchestration where compatible. Keep AI suggestions separate from deterministic media operations and creator approval; do not require proprietary model training. |
| Commerce | `src/lib/commerce/`, `src/lib/fulfillment/`, `migrations/0001_product_001e_04_commerce_orders.sql` | Reuse verified payments, identity/idempotency and server-side catalog patterns. Existing orders are single-product digital purchases with email/release fulfillment; meal quantities, lines, taxes, slots, inventory and physical delivery need separately scoped contracts. Do not register draft food in the digital checkout catalog. |
| Accounting | Existing commerce orders/payment references and insurance acquisition economics | These are source evidence, not a complete accounting ledger. Preserve business boundaries; insurance acquisition economics are not food books. Future cash/deposit/settlement reconciliation must avoid duplicate revenue and support separate books plus a combined private view. |

## Current work and missing capabilities

INS-008A is committed at the shared plan's inspection baseline. Its pure identity derivation does not issue tokens or authorize contact. Token provenance, retry lifecycle, binding, concurrency/recovery, route integration and contact authorization remain unfinished. Preserve consent/suppression checks and both private-contact provider-not-configured no-store 503 responses. The open DEV-323 specification also retains its non-executing authority boundary; these product plans do not broaden it.

Creator capabilities still need video-source import/storage contracts, creator-correctable role selection, saved reversible edit plans, local/browser/companion-worker feasibility, transcript/caption editing, audio mixing, render/export jobs, authentic thumbnails and coherent shorts. Floating-player routing continuity and audio coordination require separate testing. Livestreaming remains optional later scope.

Food capabilities still need versioned recipes/labels, draft review evidence, batches/cooling, inventory, physical orders and slots, refunds, fulfillment, reconciliation, protected exports and verified impact records. No operational food system or approved payment connection is established by the existing commerce code.

## Recurring River content trajectory

[Trash in the River](trash-in-the-river-content-trajectory.md) is a permanent first-class recurring series within the broader River journey. Its canonical editorial direction records former beliefs, personal responsibility, what God revealed, replacement beliefs and continuing downstream. Entry No. 001 remains a planned trash-carrying manifesto with an essential empty-handed return walk. It reuses existing content-series fields and the shared source/transcript/catalog/repurpose foundations; it creates no separate publishing engine or published placeholder. The linked record preserves the public faith-language rule, honest financial/abundance tension and restrained documentary identity without changing global branding or FOOD runtime/readiness work.

## Planned full-form reflection: I Will Never Again Let Fear Dictate My Life

Recorded October 10, 2026 from River's owner-supplied direction. This section is the canonical editorial planning source for a future full-form River Kept Flowing video and written reflection, and a reusable thematic thread across the broader creation direction. The strongest current working title is **I Will Never Again Let Fear Dictate My Life**. It is ideation, not a final published title. No recording, transcript, publication, completed sales departure, customer orders, revenue or successful business outcome is asserted here. This is a story being lived in real time.

### Personal source and central tension

> I spent roughly ten years in sales. I learned how to communicate, read people, endure rejection, work, sell an idea, take responsibility, survive uncertainty, and keep moving when outcomes are not guaranteed. Those years were not wasted. But I have outgrown building my entire life around sales.
>
> Take what I learned. Put it to work somewhere that actually matters to me.
>
> I want to create. I want to cook. I want to build businesses around things I actually value. I want work that can exist around my wife and boys rather than constantly removing me from them. The River Kept Flowing and its connected businesses are a different expression of those capabilities, not a denial of what sales taught me.
>
> I have talked myself out of opportunities because the full path was not visible, finances were not perfect, and I did not feel ready. I feared failure, looking foolish, choosing incorrectly, and walking away from the identity and income structure I already understood. I wanted certainty before movement. Competence can become a cage.
>
> I still do not know exactly how this works out, but uncertainty no longer gets final authority over what I attempt.
>
> Change the approach. Pursue the opportunity. Build the thing I have been talking myself out of. Use what I already know. Learn what I do not know while moving.

Preserve this as River's own transition, not an attack on sales or a generic motivational lesson. Do not manufacture an ending where leaving sales fixes everything, or claim he has already quit. Change is beginning through one decision, one boundary, one courageous step, one attempt, one fulfilled promise, and one thing actually built instead of endlessly contemplated.

### The next concrete milestone: first food orders

Beginning the cottage-food operation is a present expression of the direction. The next tangible milestone is **accepting and successfully fulfilling the first batch of actual customer orders**. It remains future, not accomplished:

1. Accept the first batch of actual customer orders.
2. Prepare the food.
3. Package it correctly.
4. Deliver or fulfill those orders.
5. Learn from it.
6. Then do it again.

> The first milestone is not becoming a massive restaurant company. It is taking the first real orders and fulfilling them. It sounds small compared with the life I imagine, but that is how lives actually change.

This is an editorial milestone, not food-sale activation authority or evidence of readiness. Preserve the separate food evidence and launch boundaries below; this content direction changes no FOOD implementation or diagnostic work. Do not invent orders, customer counts, revenue, a launch date, or footage showing fulfillment before it happens.

### Unfinished, afraid, and still becoming

The reusable thread is **fear → courage → action → becoming**. Its central image is movement despite uncertainty. Fear does not have to disappear before courage exists; courage is choosing differently while fear is still there.

> The biggest sign that I have changed may be that I no longer need my life to be perfect before I respect the person I am becoming.
>
> I can be unfinished and still growing.
>
> I can be uncertain and still move forward.
>
> I can be afraid and still choose differently.
>
> I can be struggling financially and still have dignity.
>
> I can be building something small and still respect the direction of my life.
>
> I can have unanswered questions and still obey the next thing I know to do.
>
> I refuse to let fear steal another year of my life.
>
> I will never again let fear dictate my life.

Let “fear steal another year” carry weight rather than treating it as a slogan. River believes there is more ahead without faking prosperity, success, certainty or arrival. Preserve the distinction between abundance and pretending. Dignity comes from becoming someone willing to move faithfully while unfinished; financial struggle does not erase it.

There is a difference between patiently waiting on God and hiding behind “waiting” because I am afraid to act; between wisdom and paralysis; between preparation and endlessly postponing my life. Faith does not mean pretending the outcome is guaranteed. It means being willing to take the next faithful step without seeing the entire road.

Follow the existing [faith-language rule](trash-in-the-river-content-trajectory.md#doctrine-and-voice): avoid religious identity labels. Use God, Jesus, following God, faith, obedience, stewardship, calling, and trusting God with what cannot yet be seen naturally where River's story supports them. Keep the voice personal and grounded, without preaching or artificially polishing away the tension.

### Eventual structural trajectory

This is a preserved editorial arc, not a finished script or an assertion that its milestones have happened:

1. I spent ten years becoming good at something I no longer want to build my whole life around.
2. That realization is frightening because competence can become a cage.
3. The old instinct is to demand certainty before leaving what is familiar.
4. I do not have certainty.
5. What I do have is a next step.
6. For me right now, one of those steps is taking the first actual food orders and fulfilling them.
7. It sounds small compared with the life I imagine, but that is how lives actually change.
8. One decision. One boundary. One courageous step.
9. I am taking what the last ten years taught me instead of allowing the last ten years to determine the next ten.
10. I can be unfinished and still respect who I am becoming.
11. I can be afraid and still choose differently.
12. I refuse to let fear steal another year of my life.
13. I will never again let fear dictate my life.
14. I do not need the entire map. I need the courage to take the next faithful step.

### Relationships and existing creator foundations

Faith & Calling already has related reflections: [You Do Not Need to See the Whole Road to Take the Next Right Step](../../src/content/essays/you-do-not-need-to-see-the-whole-road-to-take-the-next-right-step.md) and [You Cannot Control the Future by Worrying About It](../../src/content/essays/you-cannot-control-the-future-by-worrying-about-it.md). They establish related themes, not this specific ten-year sales transition or proof that the food milestone is complete. Preserve those works unchanged and keep this first-person story distinct.

Carry the thread into stewardship (using learned capabilities responsibly), quiet/meaningful life (choosing what is true over what looks impressive), family-centered work (presence with wife and boys), cooking and entrepreneurship (the first fulfilled batch), and The River Kept Flowing founder story (building a different expression of existing capabilities). These are relationships, not interchangeable concepts or a new top-level website section.

[Trash in the River](trash-in-the-river-content-trajectory.md) focuses on discarded beliefs, former identities, cultural conditioning and what River no longer wants carrying downstream. This reflection may reference old patterns, but centers on acting while afraid. Do not collapse it into that series or assign it an installment number by default.

Reuse the shared creator workflow and [source/transcript/catalog/repurpose lineage](trash-in-the-river-content-trajectory.md#river-os-and-canonical-creator-pipeline) for the eventual video and written reflection. The [canonical intake contract](../../src/lib/assimilation/ingestion/canonical-content-source.ts) requires a real published URL and publication timestamp; the [site collections](../../src/content.config.ts) require a publication date. Keep this unrecorded, unpublished concept here rather than fabricating an intake record or public-content placeholder. Future truthful renditions can reuse existing category, tags and related-content fields where supported, without a parallel registry, publishing engine or new runtime fields. No social-platform metadata or derivatives are generated now.

### Title ideation retained for owner review

All options remain possible titles, not publication metadata:

- I Will Never Again Let Fear Dictate My Life (strongest current working title)
- I Refuse to Let Fear Steal Another Year
- You Don’t Need the Whole Map
- I’m Taking the Next Step Anyway
- The Life I Want Starts With One Decision
- I Don’t Need to Have It All Figured Out
- I Can Be Afraid and Still Choose Differently
- Ten Years Taught Me What I Needed — Now I’m Building Something Else
- Competence Can Become a Cage
- The First Order Changes Everything

This addition records content direction only. Publication, runtime changes, FOOD-002ZL1 changes, identity changes, Cloudflare/D1 mutations, deployment, commit and push remain outside this task. Stop after local verification for owner review.

## Smallest next milestones

Creator Stage A is documentation, reuse and dependency planning: map the existing systems, preserve obligations, identify the local-processing seam, and define a real-footage acceptance scenario. Record pending format, hardware, licensing, retention and recovery decisions before selecting FFmpeg, whisper.cpp or alternatives. Stage A does not produce playable outputs. The later first useful workflow is footage plus real voiceover to a reviewable main cooking video, up to three supported shorts, authentic thumbnail options and downloadable exports; preserve originals and creator revisions, with publishing separate.

The first proposed food implementation is a pure draft-domain boundary. Describe versioned product/recipe information, ingredients/component allergens, preservation/temperature classification and independently sourced review evidence. Unknown and pending are explicit states, not default eligibility, tax exemption, safety or payment approval. Validation must have no side effects and grant no sale authority. Ingredient changes require fresh label/allergen review while preserving historical versions. This planning task creates no food instances, schemas or code.

## External readiness and privacy

Food launch depends on recipe-specific authoritative eligibility/tax guidance, applicable registration/training evidence, safe-water evidence, measured equipment/cooling/storage/transport trials, packaging/reheating, reviewed labels, banking/payment support and explicit capacity, radius, fees and refund policies. Agency correspondence is not automatically a binding ruling. Verify current official rules during later implementation; the handoff's legal statements were not independently reverified by this planning record. Cooling benchmarks are proposed best practice rather than invented permits. Do not add homeowners coverage as an opening prerequisite or infer a city food permit requirement.

Community distribution needs separately verified preparation/distribution arrangements, partner evidence and contribution terms. No nonprofit status, deductible-gift claim, public percentage promise, outside fundraising or meal count is implied. Later counters begin at zero and use reconciled confirmed evidence; transfers, settlements and meals must not be counted twice. Never identify recipients or require publicity, religious participation or a purchase for help.

Keep private addresses, credentials, EIN/banking evidence, receipts and personal records out of public/static content and examples. Stored Sesh music does not establish reuse rights. No prices, recipes, partners, approvals, hardware purchases or launch date are invented here. Food videos and creator outputs share source/media foundations without requiring publication of proprietary recipes.

## Scope of this record

Only linked planning artifacts are authorized now. No routes, schemas, migrations, persistence, checkout, Stripe changes, media rendering, public counters, livestreaming, food catalog entries, production data, provider activation, contact execution or deployment are introduced. Future work requires bounded implementation scope and the relevant external evidence; neither attractive interfaces nor passing foundation tests imply production readiness.

## Dependency and launch clarification

Creator implementation does not block food work. Creator Stage A precedes creator implementation, and the complete cooking workflow precedes general editor or public-platform expansion. Food sales activation requires its own legal, tax, water, safety and payment evidence; community gates apply only to community activation. A full accounting dashboard, paid advertising, advanced rewards, recipe publication and community fundraising are not prerequisites for an otherwise lawful food launch with adequate interim records.

## Durable handoff source records

The full handoff sections below are retained from the supplied attachment for recovery beyond this chat. They are source direction and user-reported historical evidence, not newly verified legal guidance or implementation authorization. The private operating address and private-evidence filenames are redacted; public official references and the public registry identifier are retained. Recheck applicable official requirements before implementation. Subsequent read-only reconciliation and scope instructions are represented in the linked plans above.

### Creation Platform Workflow Handoff sanitized source

```text
The River Kept Flowing — Creation Platform Workflow Handoff

Date: October 4, 2026
Owner: River Young
Purpose: Incorporate this conversation’s product direction into the existing development workflow.

1. How to apply this handoff

This is an additive direction document, not a claim about the current repository’s implementation. No repository was inspected or modified in preparing it.

The receiving workflow should reconcile this document with its current canonical plan, architecture, contracts, branch, and unfinished work before making changes. Preserve existing functioning features and required verification. Do not assume an earlier branch name, commit, route, or implementation remains current.

Record the expanded vision now. Treat the proposed video workflow as the next creation-tool candidate; integrate its priority with existing obligations rather than silently abandoning work already underway. Discover and reuse existing media, project, AI, permissions, and content infrastructure before adding parallel systems.

Deliver the first complete useful workflow before expanding into a general-purpose editor or launching a public creator platform.

2. Product direction

The River Kept Flowing is intended to become a place where people explore their lives, learn through doing, and use accessible tools to create what matters to them.

The platform connects a person’s goals, circumstances, interests, learning, and projects. Its creation experience should be simple, effortless where possible, impactful, and curated to what the person actually wants to accomplish.

Video production is one creation capability within that broader direction. Sesh remains a related music creation capability. Learning paths can eventually connect cooking, feeding a family, cottage food entrepreneurship, sales, financial stability, typing, working with AI, and practical trades such as security installation, electrical work, and solar.

These are future exploration areas, not commitments to implement every subject now. Technical or regulated learning paths require appropriate expertise and boundaries before being offered as authoritative instruction.

A person should be able to stop at any point along the river and find value there. Cooking for family is a complete goal. Making music for enjoyment is a complete goal. Starting a business is an option, not a required progression.

The financial dimension should help people make practical progress toward stability and greater freedom to create. Do not promise financial independence or a life without constraints.

3. Shared platform foundations

|Foundation               |Intended role                                                                                    |
|-------------------------|-------------------------------------------------------------------------------------------------|
|River Guide/helper       |Help someone clarify a goal, explore possibilities, and choose a manageable next step            |
|Personal workspace       |Preserve projects, source materials, outputs, progress, and voluntarily shared preferences       |
|Creation tools           |Support real projects, beginning with the focused video workflow and connecting Sesh where useful|
|Learning through projects|Teach in the context of what someone is trying to accomplish                                     |
|Optional community       |Allow sharing and contribution without requiring public exposure                                 |

River Guide should use information the person chooses to share, allow corrections and changes in direction, and offer suggestions without assigning a fixed identity. Avoid invasive profiling or forcing an extensive questionnaire before someone can create.

Use shared foundations where practical, while keeping each tool usable on its own. A user should not have to understand the entire platform to make one video.

4. Video creation: desired experience

River wants to record scenery, cooking, activities, reflections, or himself and create voiceovers. He does not want manual clipping, sequencing, thumbnail design, captioning, or music selection to consume the time he wants to spend creating.

The core interaction:

1. Add footage and a voiceover.
2. Describe the intended creation in plain language.
3. Receive a finished draft.
4. Review it and request simple changes.
5. Export approved results.

Example request:

> Use this footage of me cooking dinner and this voiceover about making time for family. Make one main video and three shorts. Keep it warm and natural, let some cooking sounds come through, and create thumbnail options.

The system should aim to organize material, transcribe speech, propose structure, sequence clips, balance audio, add captions, suggest shorts, and produce thumbnail and cover options.

Automatic outputs are drafts until reviewed. “Effortless” is a design goal, not a guarantee that all creative decisions will be correct.

5. First complete workflow

Build a constrained cooking-video workflow first:

Footage plus voiceover → main video → three suggested shorts → thumbnail options → export.

Use a repeatable structure:

• Opening: what is being made and why it matters.
• Preparation: ingredients and early actions.
• Cooking: useful process moments, with selected natural sound.
• Finished dish: result and serving.
• Closing: optional reflection or invitation.

The structure is a starting preset, not a requirement to invent missing scenes. If a necessary moment is absent, offer an omission or request another clip. Never imply footage shows an action it does not show.

First-version scope:

• Import existing recordings and a real recorded voiceover.
• Preserve source files and reusable project state.
• Let the creator identify or correct clip roles when automated matching is uncertain.
• Produce one repeatable main edit.
• Generate editable captions from a transcript.
• Balance voiceover, natural sound, and optional cleared music.
• Suggest up to three coherent shorts; offer fewer if the source does not support three worthwhile clips.
• Provide a small set of thumbnail options using authentic source frames and readable text.
• Export agreed formats through a visible job process with progress, cancellation, and actionable errors.
• Keep export and publishing separate. Initial scope ends at downloadable exports.

Choose initial formats after inspecting existing requirements. Preserve the established preference that full reflection videos stay safely under 15 minutes when targeting LinkedIn; verify current platform requirements when implementing actual exports or publishing.

6. Editing approach and honest difficulty

Build our own creation interface and orchestration around established media tools. Do not rebuild codecs, transcription engines, or a professional editing suite from scratch.

Candidate foundations:

• FFmpeg for media inspection, conversion, filtering, assembly, and rendering.
• whisper.cpp for local speech transcription.

These are candidates, not a locked stack. Validate integration, dependencies, licensing, device performance, and the current project architecture before selecting them.

|Capability                                            |Relative difficulty|
|------------------------------------------------------|-------------------|
|Trim and join clips, add voiceover, export            |Lower              |
|Captions, branding, thumbnail templates               |Moderate           |
|Mix audio and adapt output dimensions                 |Moderate           |
|Match footage to voiceover accurately                 |Higher             |
|Identify meaningful shorts without losing context     |Higher             |
|Reliably create excellent edits from arbitrary footage|Very high          |

Start with templates and creator-correctable choices. Separate deterministic media operations from AI suggestions. More advanced visual understanding and automatic editorial judgment belong in later phases.

Do not train a proprietary AI model as a prerequisite. Ownership of the experience can come from orchestration, project context, interaction design, and consistent outputs.

7. Simple creative revisions

The long-term interface should support requests such as:

• Let that shot breathe longer.
• Keep the sizzling sound.
• Use less music.
• Make the opening shorter.
• Choose a different thumbnail.
• Keep this sentence in the short so the meaning is clear.

Begin with explicit controls for these operations if conversational editing is not yet reliable. The first version does not require unrestricted natural-language editing.

Represent edits as a saved, reversible plan referencing original media. Keep versions and undo. Re-render affected outputs when necessary. Avoid destructive modification of source files.

An advanced timeline can arrive later. Do not make timeline expertise a prerequisite for ordinary creation.

8. Visual identity and channel presentation

River’s face can remain part of the relationship without appearing throughout every video or on every thumbnail.

Support:

• Brief on-camera introductions or conclusions.
• Cooking and scenery beneath River’s real voiceover.
• Natural sounds and intentional pauses.
• Thumbnails featuring the dish, landscape, activity, or an expressive authentic frame of River.
• Consistent, readable visual styling.

Do not assume that removing his face improves performance. Compare viewer response to different treatments when enough evidence exists.

Thumbnails should accurately represent the creation. Synthetic imagery or voice is optional future scope and should not silently replace real source material.

For faith-related scripts, captions, titles, descriptions, and hashtags, respect River’s established language preference: avoid “Christian,” “Christianity,” and identity labels based on those terms. Prefer following God/Jesus, faith, or walking with God as appropriate.

9. Optional floating video player

A visitor who intentionally starts a video should be able to continue watching or listening while exploring the site.

Required behavior:

• Begin with an ordinary embedded player.
• When the playing video scrolls out of view, move it into a small corner player.
• Provide play/pause, return to the full player, and a clearly accessible X.
• Closing stops playback and keeps the player closed until the visitor deliberately starts a video again.
• Never reopen it simply because the visitor scrolls.
• Avoid overlapping navigation, forms, important actions, captions, or mobile safe areas.
• Maintain one active media session rather than playing duplicate copies.
• Return to the full player without resetting playback position.
• Provide accessible labels, keyboard operation, visible focus, and usable touch targets.
• Pause competing media when someone begins recording or using an audio-focused creation tool such as Sesh.

Distinguish the site’s corner player from native browser picture-in-picture. Native picture-in-picture can be a later optional enhancement; it is not required for the site experience.

Continuing playback across internal navigation is a desired outcome. Verify the site’s routing and player-provider capabilities first. Implement it in a shared persistent layer where feasible; do not promise continuity across full page reloads or unsupported providers without testing.

10. Livestreaming: later and entirely optional

Use the same viewing experience for livestreams when River chooses to introduce them.

• Offer a quiet “River is live — join” invitation.
• Require a deliberate join; do not automatically start the stream or its audio.
• Allow minimizing, pausing where supported, returning to full view, and closing.
• Show appropriate offline, interrupted, and ended states.
• Do not imply that a paused live stream automatically resumes at the live edge; make provider-specific behavior clear.
• River can create recorded content indefinitely without livestreaming.
• Do not create pressure to broadcast constantly or share family/private moments.

Live broadcasting, chat, moderation, recording/replays, and stream infrastructure are separate later decisions. Building the recorded-video player does not mean a livestream backend exists.

11. Cost and processing direction

The goal is to reduce subscription dependence and support an affordable creation experience.

Prefer local processing for River’s initial personal workflow where his hardware supports it. A website may need a browser-capable implementation or a local companion worker; determine this from the existing architecture. A web interface does not automatically give access to installed desktop tools.

Account for development, hardware, storage, bandwidth, maintenance, and optional hosted AI/rendering. Open-source components do not make the complete service cost-free.

A later public version requires measured job limits, retention settings, queue capacity, and a sustainable cost model. Do not promise unlimited free cloud processing.

Use music the creator owns or is entitled to use in the intended outputs. Music imported from Sesh is not automatically cleared merely because it is stored there.

12. Implementation sequence and completion checks

Stage A — Reconcile and scope

Inspect current project state, existing contracts, and unfinished obligations. Identify reusable systems. Record this direction in the canonical plan and define the smallest end-to-end milestone.

Completion: a grounded implementation plan with dependencies and clear current versus future scope.

Stage B — Personal cooking-video workflow

Implement import, project persistence, explicit edit structure, transcript/captions, audio mix, main export, suggested shorts, and thumbnail options.

Completion: real River footage produces playable outputs he can review and revise; originals remain intact; failures are recoverable. Measure hands-on time saved rather than merely demonstrating an attractive interface.

Stage C — Recorded-video viewing

Implement the dismissible floating player and appropriate internal-navigation continuity.

Completion: desktop and mobile behavior is verified; X stops playback; it stays closed; controls remain accessible; recording and other audio experiences do not conflict.

Stage D — Improve automation

Use actual corrections to improve clip selection, pacing, reframing, shorts, and conversational revisions. Preserve creator control.

Completion: less manual intervention across multiple real projects without unacceptable loss of meaning or authenticity.

Stage E — Optional expansion

Introduce livestreaming when River is ready. Expand to other creators and connect learning paths and community as validated needs emerge.

Completion criteria should be defined separately for each expansion. Avoid treating the long-term vision as a single launch milestone.

13. Instructions to the receiving workflow

Read this document in full, reconcile it with the existing canonical state, and incorporate the direction without duplicating systems or claiming unbuilt features are complete.

Lead with one useful creation workflow. Preserve the broader river journey as the organizing vision. Keep livestreaming optional. Make the creator’s intent central, support reversibility, and keep costs visible.

The practical measure of success is that River spends more time creating and living, and less time operating editing software.

Technical references

These references establish candidate foundations, not the completeness of the proposed platform:

• FFmpeg capabilities: https://ffmpeg.org/about.html
• FFmpeg licensing considerations: https://ffmpeg.org/legal.html
• whisper.cpp repository and local inference support: https://github.com/ggml-org/whisper.cpp

Verify current documentation and applicable obligations during implementation.
```

### Food Business and Community Meals Handoff sanitized source

```text
The River Kept Flowing — Food Business and Community Meals Implementation Handoff

Date: October 4, 2026 (America/Chicago)
Owner: River Young
Website: https://theriverkeptflowing.com
Purpose: Apply this conversation’s decisions and ideas to the existing command-chat development workflow. This is an implementation brief and startup record, not proof that the website features are already built or that unresolved products have been approved.

1. Instructions to the receiving command chat

Read this document fully. Incorporate it into the existing RIVERKEPTFLOWING project and its current plan. Preserve the existing website, architecture, authentication, content system, insurance work, Sesh work, and other accepted handoffs. This document adds the food-business and community-impact requirements; it does not replace unrelated trajectories.

Start with read-only discovery of the current repository: branch, HEAD, working-tree changes, relevant instructions, existing routes, backend, database, payment integrations, private dashboard, content/video support, and deployment configuration. Prior branch names and commits from earlier chats are historical, not current verification targets. Do not reset or overwrite work to match them.

Continue the user’s established one-step-at-a-time command workflow. Give commands compatible with the actual environment; the user’s existing local workflow uses PowerShell. Keep readable HTML/CSS. Use the existing Cloudflare publishing workflow. Do not move the project to a different hosting platform or create a duplicate site simply to satisfy this brief.

Extend existing business, order, media, accounting, and identity models where practical. Report implemented, tested, pending, and blocked features separately. Build concrete reviewable changes; never claim a feature, agency approval, bank account, payment connection, or charity partner exists when it does not.

2. Business intent and operating constraints

River wants to cook from home around his wife and children, create culinary videos, and grow a business serving Big Spring and nearby West Texas households. The core value is convenient, good food that saves shopping, cooking, and cleanup for working families, including households with long oilfield schedules.

Launch model: packaged meatless refrigerated/frozen meals intended for customer reheating. Start as River Young, individual sole proprietor; revisit an LLC when affordable. An LLC is not currently formed for this operation. River wants only products and sales methods with verified favorable Texas sales-tax treatment; do not treat cottage status, cold temperature, or freezing as a blanket exemption. Sales-tax exemption is separate from income/self-employment tax.

The whole business belongs within The River Kept Flowing: public ordering and useful food content, private operational records, CPA exports, marketing attribution, and eventually anonymized educational resources showing others how to start and organize a business.

3. Verified progress and pending inquiries

|Item                        |Current state                                                                                                                   |Handling                                                                       |
|----------------------------|--------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
|Food-handler training       |Completed; certificate expires October 3, 2028                                                                                  |Retain certificate privately                                                   |
|DSHS cottage registration   |Cottage Food Registry #21269; portal status Current; expiry field blank                                                         |Public registration identifier may appear on labels; do not invent an expiry   |
|Registered setup            |River Young; sole owner/proprietorship; DBA blank                                                                               |No LLC or DBA claimed                                                          |
|Registration attributes     |NPAR and TCSP checked; cottage vendor attribute unchecked                                                                       |Registered identifier instead of address; temperature-controlled food operation|
|Registered food description |Refrigerated and frozen meatless prepared meals requiring temperature control for safety, intended for reheating by the consumer|Other categories need appropriate review and registry updates if applicable    |
|IRS EIN                     |Obtained; user saved results                                                                                                    |Number not supplied here; securely retain actual confirmation letter           |
|Comptroller inquiry         |Successfully submitted October 3, 2026                                                                                          |Written response pending                                                       |
|First Watch banking inquiry |Submitted; response pending                                                                                                     |Account not yet opened                                                         |
|Culligan water-results email|Sent; response pending                                                                                                          |No confirmed potable-water result yet                                          |

Comptroller inquiry describes direct prepaid online sales of cold/frozen meatless reheat meals; no seller heating, utensils, dining, or staffed catering. It asks about exemption under Rule 3.293, individual portions/bundles/subscriptions, permit/return obligations when selling only exempt foods, delivery charges, and changes that make sales taxable. It does not resolve cold salads or açaí bowls. General correspondence must not be presented as a binding private ruling.

First Watch published fees checked October 3: business checking $9.95/month and new business membership $15 per share account. Waivers, existing-member treatment, opening deposit, remote opening, business-authorized free account options, and required documents remain unconfirmed.

4. Food eligibility and tax classification

Texas’s current cottage framework generally permits foods except meat/poultry products, seafood products, ice/ice products such as ice cream and popsicles, low-acid canned goods, CBD/THC products, and raw milk/products. Ingredient choices must respect these exclusions; meat broth is not a workaround.

Product records must distinguish: cottage eligibility, temperature-control needs, preservation process, allergen information, sales-tax classification, source/evidence, and review status. Unknown is a real status, not a default exemption.

|Category discussed                                               |Operational interpretation                                                                                                                                  |
|-----------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Frozen/refrigerated meatless reheat meals                        |Main launch candidate; exact tax model awaiting Comptroller guidance                                                                                        |
|Bread, tortillas, cookies, muffins, pastries, cakes, pies        |Cottage candidates; published tax guidance supports qualifying bakery items sold unheated without utensils; product specifics still matter                  |
|Plain cut fruit/vegetable packs                                  |Potential alternative; cutting/repackaging exemption differs from mixing a prepared salad; refrigeration may be needed                                      |
|Dry herbs, seasonings, ingredient/baking mixes                   |Potential grocery products; verify actual product classification                                                                                            |
|Jams, jellies, preserves, fruit butters                          |Potential additions; safe process and exact tax classification must be established                                                                          |
|Pickles, fermented vegetables, plant-based acidified canned foods|Preservation controls and appropriate records required; not automatically shelf stable or tax exempt                                                        |
|Sauces, dips, salsa, pesto, hummus                               |Cottage eligibility can differ from sales-tax treatment; seller-mixed ready-to-eat products raise prepared-food tax issues                                  |
|Cold salads, including leafy, pasta, potato, bean                |Some meatless recipes can be cottage foods; do not approve as sales-tax exempt simply because cold                                                          |
|Juices and bottled drinks                                        |Ingredient/service tax distinctions and applicable processing/label requirements; untreated packaged juice may require additional warning                   |
|Frozen açaí bowls                                                |Unresolved: possible prohibited ice-product classification plus prepared-food/snack tax issues; get recipe-specific DSHS and Comptroller answers before sale|

Published law uses an annual gross-sales/income ceiling of $150,000 with statutory annual inflation adjustment. Expenses do not reduce sales counted toward the ceiling. Configure the limit and review date; verify the currently applicable adjusted threshold before launch and annually. Do not hardcode $150,000 permanently or make the threshold a profit counter.

5. Property, water, and equipment

Homeowner is River’s mother-in-law; River reports permission to operate. Home title is not in River’s name. He reports no homeowners/mobile-home coverage for his house and explicitly does not want to pursue it. Separate business/product liability may be considered independently; do not reintroduce homeowners coverage as an opening requirement.

Private operating address supplied: [REDACTED private operating address]. Keep it out of public pages by default. City-limit status remains unverified. Howard CAD’s 2026 records did not establish an exact 300-address match. Do not declare the home within Forsan, Big Spring, or unincorporated territory based on postal city or school district. Texas cottage protections prohibit local food permits/fees for qualifying direct sales and municipal zoning bans on home cottage production; do not invent a city food permit gate. Other specific property/construction issues require their own review if triggered.

Water: private well. Culligan verbally discussed approximately 250 versus target 50 and 13 versus target 10; analytes and units unknown. Do not interpret these as nitrate, arsenic, TDS, hardness, or potable-water clearance without the report. Request testing details and whether bacteria, nitrate, arsenic were tested. TCEQ recommends accredited drinking-water lab testing. Midland Utilities Laboratory offers total coliform/E. coli testing; nitrate capability/referral and current price pending.

River is willing to use commercially bottled purified drinking water in five-gallon jugs for cooking/produce washing and to consider RO if necessary. Safe-water planning also includes utensils, food-contact surfaces, and handwashing. Baking soda does not establish safety; boiling does not remove chemical contamination. Select treatment based on actual results, not sales claims or hardness alone. Well testing is a safety recommendation, not an invented cottage licensing requirement.

Current equipment: household refrigerator/freezer combo. Proposed: approximately $200 chest freezer plus used full-size refrigerator, both inside the house. Purchases not made; River will provide listings/options before selection. No confirmed dimensions or complete budget. Refrigeration cooling capacity is separate from frozen storage capacity. Small mini-fridge should not be assumed adequate for bulk hot batches.

Initial supporting equipment: digital probe thermometer, appliance thermometers, shallow food-safe cooling pans, ice-bath containers, freezer-suitable containers, labels, insulated transport containers/cold packs. Cling-film dispenser/professional wrapping system and vacuum sealing are interests, not selected purchases. Vacuum sealing is not room-temperature preservation; refrigerated reduced-oxygen products need appropriate process review.

6. Production, cooling, storage, and traceability

Build recipe versions and production batches linked to ingredient purchases, allergens, yields, portions, preparation date, cooling measurements, storage location, packaging, and fulfilled orders. Replacing an ingredient must trigger label/allergen review; do not silently apply a recipe’s old labels.

For launch trials adopt FDA cooling benchmark as operational best practice: cooked food from 135°F to 70°F within two hours and to 41°F within six hours total. Cottage operations are exempt from ordinary Texas Food Establishment Rules; do not mislabel this benchmark as an additional permit requirement. Use shallow pans, small portions, ice baths, airflow, and measured temperatures. Do not leave meals out to cool for hours or load appliances with excessive hot food.

Cold TCS food must achieve internal temperature at or below 41°F during holding/delivery. Target freezer storage at or below 0°F. Frozen products should remain frozen through intended distribution; a cold temperature minimum is not a promise of frozen product quality.

Home-preservation guidance suggests roughly 2–3 pounds of unfrozen food per cubic foot over 24 hours; treat this as a planning guideline and use manufacturer capacity and actual trials, not a guaranteed production rating. Batch limits should be determined by measured cooling/freezing performance. Record exceptions, disposal, and corrective actions.

Test freeze/thaw/reheat quality for each meal. Packaging should limit air exposure and moisture loss, allow needed expansion, and suit the stated microwave/oven method. Do not promise zero freezer burn or invent commercial shelf life from household leftover guidance.

Pickling/fermentation: use the applicable approved-source recipe, qualified process validation, or legally available calibrated equilibrium-pH testing route; maintain required batch/recipe/source/result/date records at least 12 months where applicable. The statute contains a pickled-cucumber exception: verify precise applicability before implementing category-specific mandatory rules. pH at or below 4.6 alone does not validate a shelf-stable heat-processing method. Jars sealing does not establish shelf stability. Refrigerated, frozen, and room-temperature products need separate documented processes.

7. Packaging, labels, QR codes, and content

Required label fields from DSHS: legible operator name; address or registered identifier; common product name; major allergens present; exact statutory private-residence disclosure. TCS labels include preparation date and the exact safe-handling statement on the label or accompanying invoice/receipt in at least 12-point type. Use current official text from the source below rather than paraphrasing it in production labels. Preserve required wording and legibility when printing. Applicable pickle/ferment/acidified products also need unique batch numbers.

User-approved richer label standard: full ingredient list including purchased-component subingredients, clear Contains declaration, portion/net quantity where applicable, batch code for every meal, storage and tested reheating directions, River Young identity, #21269, website QR, and optional brand presentation once naming/DBA decisions are handled. Ingredient disclosure need not publish recipe quantities or technique. Do not use generic spice terms to conceal allergens.

Retail UPC/GS1 barcode is not currently required for the direct-order model; internal product and batch codes may be implemented. A QR code should open a stable meal-information page with product/version, ingredients, allergens, reheating, video, availability and reorder controls. QR does not replace required physical or pre-payment disclosures. Preserve historical recipe/label records when the current product page changes.

Full recipes are optional. Public content can show preparation, finished food, honest ingredient information, reheating, and River’s videos without disclosing proprietary quantities/techniques. Reuse the existing media/content system and coordinate with the separate creator-platform workflow handoff; do not recreate an unrelated video editor here. Avoid unsupported nutritional/health or allergen-free claims.

8. Website ordering and personal fulfillment

User’s chosen flow: order and payment on the site before River is dispatched to deliver or meet the customer. Service area covers Big Spring/immediate surroundings with an editable radius; radius and specific meeting places not chosen yet. Outside-area requests need manual approval. No nationwide shipping checkout.

Flow: menu/quantity → delivery or meetup location → service-area and time-slot check → delivery fee and final total → required disclosures → payment → confirmed handoff window. Prefer driving distance/time for practical delivery pricing, with a clearly defined radius policy. Never expose the home origin unnecessarily.

Outside-area flow: request → River reviews route/location/time/cost → approves a fee and window → payment link → paid confirmation. Do not charge automatically for an unapproved trip. Require permission for recurring public meetup locations where needed.

Admin order states: requested, awaiting approval/payment, paid, scheduled, preparing, ready, dispatched, handed over, cancelled, refunded. Model partial refunds and exceptions. Reserve inventory and avoid overselling. Limit launch capacity by batch and delivery slots. Define order cutoffs, cancellation/refund policy, missed-meetup process, and rescheduling before enabling checkout.

Texas online cottage sales require personal delivery by operator, employee, or household member and required labeling information before payment. Do not enable USPS/UPS/FedEx or third-party app courier shipping as if allowed by this cottage setup. Confirm any interpretation of prepaid home pickup with DSHS before treating it as interchangeable with the specified personal-delivery flow.

Transport food in appropriate insulated containers and record handoff/temperature controls. Arrival notifications and handoff confirmation are desired. Do not auto-subscribe customers to marketing texts; use consent-based communication settings.

9. Payments and business records under one roof

Stripe is a candidate, not selected, approved, or connected. Verify current processor support for an individual Texas cottage food seller, required identity/bank documents, allowed goods, settlement timing, fees, disputes, refund terms, and contribution handling. All electronic sales go through the chosen vendor. Cash does not pass through that vendor: enter cash sales daily and match them to website orders and later deposits.

Accounting records must distinguish gross item sales, discounts, refunds, taxable/exempt lines, tax collected, delivery charges, processor fees, tips if enabled, payment settlements, cash sales, cash deposits, owner contributions/draws, expenses and equipment. A settlement or deposit is not another sale. Store reconciled bank imports without duplicate revenue. Separate each business’s books while providing a combined private dashboard.

Use verified server-side prices/tax/discounts. Do not rely on browser values. Use hosted payment collection/tokenization; do not store card numbers/CVC. Verify webhook signatures, handle repeated/out-of-order events safely, and confirm payment server-side before dispatch. A success-page visit alone is not proof of payment. Keep production/test data separate and secrets outside source control.

Trace every expense to date, payee, category, business purpose, amount, receipt, and business/program. Do not assume every receipt is immediately deductible or that equipment purchases are ordinary expenses. Flag uncertain treatments for the CPA. Bank statements alone do not explain purchase purpose or capture all tax records.

CPA command goal: “Prepare my food-business records for 2026.” Generate a dated package of reconciled transaction CSVs, income/expense reports with stated accounting basis, equipment register, processor settlements/fees, sales-tax records, receipt index/files, owner transfers, community-fund activity, and unresolved questions. Check completeness before calling it CPA-ready. No autonomous tax filing or treating an AI-generated category as CPA approval.

Until implementation, retain receipts/source records and use separate business banking when available. The full accounting application need not block a small lawful launch with adequate interim records.

10. Retention, offers, and attribution

Every first-order bag/package should include a card linking to The River Kept Flowing with a QR and checkout code giving 20% off the customer’s next three orders. This is a chosen offer concept; minimum spend, maximum discount, expiry, applicable charges, and final margin approval are not yet set.

Implement one welcome offer per customer; three actual qualifying redemptions; visible remaining uses; no unintended stacking; rules for cancellation/refund restoration; attribution to the original card/order. Guest orders should not trivially create unlimited offers. Reserve/redeem benefits transactionally so simultaneous payments cannot consume or duplicate uses incorrectly.

Optional later rewards based on order value, meal count, frequency, and renewal. Weekly-bundle renewal could earn one bonus meal after meeting a qualifying threshold. Do not activate recurring billing/subscriptions by implication. Show clear terms and consent if added. Measure actual retained margin, not just order count, and record free meals/discounts/cost of goods distinctly.

11. Local marketing and educational services

Channels: River’s own creative food videos and ads, local Facebook groups subject to group rules, in-person farmers’ markets/trade shows/local events, package cards, and optional paid geo-targeted ads/radio after economics are proven. No cold outreach quotas are implied. Identify event opportunities separately; none booked in this conversation.

Track source links, campaign codes/QRs, first purchase, discount redemption, repeat purchase, average order value, margins, and paid acquisition cost. Attribute carefully when customers touch multiple channels. Do not report organic reach as confirmed customers.

Future education: publish sanitized startup steps, actual costs, equipment decisions, labels, marketing tests, and organizational examples. Distinguish River’s experience from general advice; do not share customer records, private addresses, EIN, bank details, receipts with personal information, or agency correspondence without review. Real data should support guides and services teaching business setup and tax-time organization.

12. Community meals, faith, privacy, and public counters

River wants a defined percentage of business proceeds to help feed neighbors facing hunger, including families, unhoused people, and people without transport. Hot ready-to-eat meals matter because recipients may lack cooking facilities. Public reporting should give glory to God and express following Jesus; avoid Christian/Christianity identity labels in content per the user’s established preference.

Percentage and basis remain unset. Choose after meal costing; explicitly define sales versus profit, treatment of refunds/discounts/tax/delivery, transfer frequency, and destination before making a public percentage promise. Business-funded giving is first; outside contributions are a later feature once the partner and money-handling arrangement are established. Do not claim the sole proprietor is a nonprofit or that payments are tax-deductible charitable gifts. Payment-vendor approval and lawful collection/receipting need separate review.

DSHS says TCS cottage foods are not eligible for donation under cottage guidance. This is not a general assertion that all private feeding is illegal; the planned business cannot assume its cottage exemption authorizes hot-meal charitable distribution. Recommended route: an established community organization with appropriately permitted kitchen/preparation/distribution arrangements, with River funding supplies and potentially cooking there. Donating finished home TCS meals to a partner does not itself cure the issue. Partner not chosen. Verify specific arrangements before operation. Do not count unserved intentions as meals.

Public dashboard:

|Metric                        |Evidence and meaning                                                              |
|------------------------------|----------------------------------------------------------------------------------|
|Meals directly served         |Actual confirmed handoffs from distribution logs                                  |
|Partner meals funded/confirmed|Separate partner-verified quantity or explicitly disclosed equivalent methodology |
|Business money contributed    |Completed actual transfers, not merely budget promises                            |
|Outside contributions received|Settled receipts, adjusted for refunds/chargebacks                                |
|Grocery spending              |Program-coded receipts/payments; distinguish usable inventory from delivered meals|
|Other spending                |Packaging, delivery and partner payments, separately itemized                     |
|Remaining funds               |Reconciled receipts minus spending, with obligations/committed funds distinguished|

Do not double-count a meal under direct and partner channels. Count meals, not unique people, unless actual privacy-preserving unique counts exist. A person served five meals is five meals served. Store expenditure and distribution dates separately. Do not count business transfers twice when aggregating funds. Cost per meal requires a disclosed basis and period, and must not imply each grocery dollar immediately became a delivered meal.

Monthly public updates: period and cumulative totals, last reconciliation/publication date, plain definitions, funds received/spent/remaining, and approved redacted supporting summaries. Private receipts, partners’ records, and evidence support the totals. Zero is the correct starting count. Corrections must be auditable. No public fake demo totals or fabricated meal equivalents.

Recipient privacy is firm: no faces, names, addresses, identifying stories, public vulnerability labels, filming handoffs, or publicity requirement. Donor names private unless opted in. Reporting can show cooking, supplies, hands preparing food, and aggregate results without identifying recipients. Receiving help must not require publicity, religious participation, or a purchase.

Inspiration: Tony Robbins and Feeding America’s billion-meal campaign and subsequent challenge. Distinguish its network/funding measures from River’s actual meals; do not borrow their dollar-to-meal ratio or imply partnership.

13. Data architecture and access

Adapt the existing schema to represent business/legal identity; product and recipe versions; ingredient/component/allergen data; batches and cooling logs; inventory; labels; customers/consent; orders/lines; fulfillment requests/slots; payments/refunds/settlements; cash entries and deposit reconciliation; coupons/redemptions; purchase receipts and equipment; campaigns; contribution transactions; program expenses; partner confirmations; distribution events; and approved impact snapshots.

Keep public product/impact projections separate from confidential operational records. Role-based access; River as administrator; staff only if later authorized. Apply server-side permissions, secure receipt storage, protected exports, backups, and migration/rollback practices. Do not put private business records in a public static content directory. Label/history versioning should support tracing a complaint to a particular order/batch.

14. Implementation phases and acceptance checks

Phase 1 — discovery and documentation: find existing systems, preserve current trajectory, map missing capabilities, add this brief to project planning. Build drafts without prematurely enabling sales.

Phase 2 — launch ordering: reviewed small menu, product detail/disclosures, location/radius/time selection, manual exception approval, payment vendor integration, inventory and paid-order dashboard, basic exports and label generation. Activate only after actual legal/safety/payment/tax readiness is resolved.

Phase 3 — operations/accounting: receipts, expenses, bank/payment/cash reconciliation, equipment, cooling/batches/inventory, accurate gross-sales limit monitor, CPA package.

Phase 4 — retention/content: first-order cards/QR, three-use welcome offer, reorder links, videos, attribution; renewal benefits after margin review.

Phase 5 — community program: partner process, fund accounting, actual distribution logs, reconciled public counters, monthly updates; outside contributions only after specific setup.

Phase 6 — education: reviewed anonymized real-world examples and guides powered by the records, without exposing private data.

Meaningful checks: repeated payment webhooks cannot duplicate revenue/orders/rewards; out-of-radius trips cannot charge before approval; invalid totals/discounts cannot be supplied by client; tax status unknown blocks false exemption; cancelled payments cannot dispatch; stock/slot/coupon races cannot oversell; cash deposits/processor payouts cannot duplicate sales; exports reconcile to source records; required label fields/font survive printing; recipe changes preserve old labels; public impact snapshots exclude unverified counts/private data and do not double-count transfers/meals. Use tests appropriate to actual changes, not tests that merely mirror code.

15. Opening readiness and next real-world work

No opening date is confirmed. Core registration/training/EIN work is complete; setup is not complete. Resolve: Comptroller response/exemption-only product model; banking; safe water results/remaining testing; actual equipment and successful cooling/storage trial; two or three initial recipes and costs; package/reheat trials; physical and online labels; payment/provider setup; capacity, radius, slots, fees, refunds and personal fulfillment. Optional full accounting dashboard, paid advertising, recipe publication, advanced rewards and community fundraising should not silently become legal prerequisites for opening.

Next development action: inspect the current repository and identify the smallest implementation slice that adds the food-business model coherently to existing infrastructure. Next user decisions: initial meals, recipe details, equipment listings, actual service radius/meetup spots, budget, and responses from agencies/vendors. Do not replace these with invented defaults represented as user approvals.

16. Source links and private evidence

Official sources checked during this conversation October 3–4, 2026; recheck when implementing legal/tax rules:

• DSHS cottage foods, restrictions, temperature/labels, online delivery, donation guidance: https://www.dshs.texas.gov/retail-food-establishments/permits-retail-food-establishments/texas-cottage-food-production
• Texas Health and Safety Code Chapter 437 (especially 437.001, 437.0192–437.01955): https://tcss.legis.texas.gov/docs/HS/htm/HS.437.htm
• Municipal cottage zoning protection 211.032: https://tcss.legis.texas.gov/resources/LG/htm/LG.211.htm
• Comptroller food sales-tax guidance: https://comptroller.texas.gov/taxes/publications/96-280.php
• Comptroller written inquiry form: https://comptroller.texas.gov/web-forms/tax-help/
• Texas sole proprietor/name guidance: https://www.sos.texas.gov/corp/businessstructure.shtml
• IRS EIN: https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number
• First Watch fees: https://www.myfwcu.org/bank/rates-and-fees
• First Watch contact: https://www.myfwcu.org/connect/contact-us
• Well-water testing: https://www.tceq.texas.gov/drinkingwater/my-drinking-water-quality
• Midland laboratory: https://www.midlandtexas.gov/463/Water-Testing-Services (432-681-7618; microlab@midlandtexas.gov)
• Culligan Big Spring: https://www.culligan.com/locations/tx/big-spring (steven@culliganbigspring.com; 432-263-8781)
• FDA cooling methods: https://www.fda.gov/media/79571/download
• FDA Food Code benchmark: https://www.fda.gov/media/184685/download
• Freezer loading/storage: https://nchfp.uga.edu/how/freeze/freeze-general-information/freezing-pointers/
• Safe produce washing: https://www.fda.gov/consumers/consumer-updates/7-tips-cleaning-fruits-vegetables
• Well treatment: https://www.cdc.gov/drinking-water/safety/guidelines-for-treating-well-water.html
• Tony Robbins/Feeding America: https://www.feedingamerica.org/partners/why-i-partner/tony-robbins and https://www.feedingamerica.org/about-us/partners/current-promotions/1-billion-meals

Private evidence was supplied separately and remains private. Do not expose underlying redacted PDF text or publish/request the EIN number.

Related creator-platform document exists separately: River-Creation-Platform-Workflow-Handoff-2026-10-04.md. Its contents were not reviewed for this handoff. Read it in the receiving workflow before integrating overlapping media features; do not assume this document supersedes it.
```

## October 8 restaurant and optional nutrition direction

The [canonical long-term FOOD vision](food-restaurant-product-vision.md) extends these foundations: one chef-driven restaurant/food brand and one recipe system support default restaurant ordering plus optional precision nutrition and meal planning. The [FOOD-003 direction](../../.river-dev/specifications/food-003-long-term-restaurant-nutrition-planning-direction.json) preserves the identity/admin sequence, provisional FOOD-003A-E trajectory, progressive launch phases and canonical synthesis of the owner product direction. The optional calculator is not a prerequisite for an otherwise ready restaurant launch. This addition grants no implementation or activation authority.
