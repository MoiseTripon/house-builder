This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

 root/
  app/
    layout.tsx
    page.tsx                         # dashboard
    builder/
      page.tsx                       # <BuilderScreen />
    wizard/
      page.tsx                       # <WizardScreen />
    projects/
      page.tsx
      [id]/
        page.tsx

  components/
    ui/                              # shadcn/ui components (generated)
      button.tsx
      dialog.tsx
      tabs.tsx
      popover.tsx
      tooltip.tsx
      ...
  lib/
    utils.ts                         # shadcn cn() helper

  screens/                           # page-level composition (thin)
    BuilderScreen.tsx                # composes EditorShell + panels
    WizardScreen.tsx

  features/
    editor/                          # modes, selection, commands, undo/redo
      ui/
        EditorShell.tsx              # canvas + panels layout
        TopBar.tsx                   # undo/redo, snap, units
        ModeSwitch.tsx               # Select / Split
        AdvancedToggle.tsx           # Simple / Advanced
      model/
        editor.store.ts              # plan + selection + mode + history
        editor.selectors.ts          # derived pipeline root
        selection.types.ts           # Vertex/Edge/Face selection model
      commands/
        command.types.ts             # MoveVertex, SetEdgeLength, SplitFace...
        apply.ts                     # apply(command) => next state
      tools/
        ToolHost.ts                  # runs active tool
        SelectTool.ts                # select + drag + handles + numeric edit hooks
        SplitTool.ts                 # guided split (preview/snap/commit)
      interaction/
        shortcuts.ts                 # ESC cancel, delete, shift-multi
      index.ts

    wizard/                          # step-by-step fast build
      ui/
        Wizard.tsx
        steps/
          BaseStep.tsx               # template or draw polygon
          WallsStep.tsx              # choose wall system + height
          RoofStep.tsx               # choose roof type + pitch/overhang/spacing
          ReviewStep.tsx             # takeoff preview + export
      model/
        wizard.store.ts
      lib/
        builtins.bases.ts            # rectangle/L/U presets
        builtins.roofs.ts            # gable preset defaults
      index.ts

    systems/                         # “pieces library” (systems + SKUs)
      ui/
        SystemsPicker.tsx            # fast preset picker (simple mode)
        SystemsManager.tsx           # full CRUD (advanced)
        WallSystemEditor.tsx
        RoofSystemEditor.tsx
        CatalogEditor.tsx            # SKUs (lengths, sheet sizes)
      model/
        systems.store.ts             # systems + catalog + versioning/freeze
        systems.types.ts
        systems.selectors.ts
      presets/
        eu.ts
        us.ts
      index.ts

    templates/                       # save/load base + roof templates
      ui/
        TemplatesPanel.tsx
        SaveTemplateDialog.tsx
      model/
        templates.store.ts
      lib/
        storage.local.ts
      index.ts

    walls/                           # assigns wall systems to edges, overrides
      ui/
        WallsPanel.tsx               # global defaults (simple)
        WallProperties.tsx           # selection-based (advanced)
      model/
        walls.store.ts               # edgeId -> WallElement config
        walls.selectors.ts
        walls.defaults.ts
      index.ts

    roof/                            # assigns roof system/type to face(s), overrides
      ui/
        RoofPanel.tsx                # simple controls
        RoofProperties.tsx           # advanced per-plane overrides (later)
      model/
        roof.store.ts                # roof config per face/building
        roof.selectors.ts
        roof.defaults.ts
      index.ts

    takeoff/                         # pieces output + tables
      ui/
        TakeoffPanel.tsx
        PiecesTable.tsx              # shadcn table pattern
        PackingSummary.tsx
      model/
        takeoff.selectors.ts         # derives Piece[] from domain
      index.ts

    export/                          # PDF/CSV + screenshots
      ui/
        ExportPanel.tsx
        ExportDialog.tsx
      lib/
        csv.ts
        pdf.ts
      index.ts

    project/                         # save/load project state
      model/
        project.store.ts             # current project metadata
      lib/
        storage.local.ts             # local-first persistence
        storage.cloud.ts             # later
      index.ts

  scene/                             # R3F adapter layer (render + picking only)
    BuilderCanvas.tsx
    interaction/
      pointerToPlan.ts               # ray -> plan coords
      picking.ts                     # mesh hit -> vertex/edge/face id
      gizmoHandles.ts                # translate/rotate handles (visual+events)
      preview.ts                     # split preview visuals
    objects/
      Grid.tsx
      PlanLines.tsx                  # edges (2D)
      WallSolids.tsx                 # derived thick wall meshes
      RoofSolids.tsx                 # derived roof meshes
      Highlights.tsx                 # selection highlight
      Labels.tsx                     # dimensions overlay (optional)

  domain/                            # pure logic (no React/Three)
    plan/
      types.ts                       # Vertex, Edge, Face
      mutations.ts                   # add/move/merge/split primitives
      constraints.ts                 # set length/angle helpers
      validate.ts                    # no self-intersections, face validity
      faces.ts                       # build/update faces after splits
    geometry/
      vec2.ts
      snap.ts                        # grid/angle snap
      offset.ts                      # wall thickness offsets
      intersect.ts                   # segment/line intersection
      polygon.ts                     # split polygon, point-in-poly, etc.
    structure/
      wallSystem.ts                  # system->effective thickness/layers
      cornerJoin.ts                  # miter/butt rules, corner stud packs
      wallSolid.ts                   # plan+wallElem -> thick wall geometry + net lengths
      roofSystem.ts
      roofTypes/
        gable.ts                     # roof planes + rafters math
      roofSolid.ts                   # roof geometry from faces/spec
    takeoff/
      piece.types.ts                 # Piece, EndCut
      wallPieces.ts                  # studs/plates/sheathing + end cuts
      roofPieces.ts                  # rafters/ridge/sheathing + end cuts
      aggregate.ts                   # combine counts
      pack.ts                        # cut packing to stock lengths (optional)
    units/
      units.ts                       # mm/m, rounding, formatting

  shared/
    ui/
      Panel.tsx                      # layout wrapper (can use shadcn Card)
      NumberField.tsx                # controlled numeric input
      Segmented.tsx                  # mode switch UI
      Toast.tsx
    lib/
      ids.ts
      clamp.ts
      memo.ts
    types/
      common.ts

  tests/
    domain/
      plan.validate.test.ts
      geometry.offset.test.ts
      structure.wallSolid.test.ts
      takeoff.wallPieces.test.ts
      takeoff.roofPieces.test.ts