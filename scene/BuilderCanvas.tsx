"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import { Grid } from "./objects/Grid";
import { PlanLines } from "./objects/PlanLines";
import { Highlights } from "./objects/Highlights";
import { Labels } from "./objects/Labels";
import { CanvasInteraction } from "./interaction/CanvasInteraction";
import { useEditorStore } from "@/features/editor/model/editor.store";

export function BuilderCanvas() {
  const camera = useEditorStore((s) => s.camera);

  return (
    <div className="w-full h-full">
      <Canvas
        orthographic
        camera={{
          position: [camera.x, camera.y, 100],
          zoom: camera.zoom * 0.1, // scale: 1mm = 0.1 pixels at zoom 1
          near: 0.1,
          far: 1000,
          up: [0, 0, 1],
        }}
        style={{ background: "#0a0a0f" }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={1} />
        <Grid />
        <PlanLines />
        <Highlights />
        <Labels />
        <CanvasInteraction />
        <MapControls
          enableRotate={false}
          enableDamping={false}
          screenSpacePanning={true}
          zoomSpeed={1.2}
          onChange={(e) => {
            if (e?.target) {
              const cam = e.target.object;
              useEditorStore.getState().setCamera({
                x: cam.position.x,
                y: cam.position.y,
                zoom: cam.zoom * 10,
              });
            }
          }}
        />
      </Canvas>
    </div>
  );
}
