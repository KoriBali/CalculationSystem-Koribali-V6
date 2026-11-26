import { validateWithYup } from "../../utils";
import { PoleConfigSchema } from "../../schemas/pole/custom/PoleConfigSchema";
import { PoleStructuralSchema } from "../../schemas/pole/custom/PoleStructuralSchema";
import { PoleFormSchema } from "../../schemas/pole/custom/PoleFormSchema";
import { DirectObjectSchema } from "../../schemas/pole/custom/DirectObjectSchema";
import { OverheadWireSchema } from "../../schemas/pole/custom/OverheadWireSchema";
import { ArmSchema } from "../../schemas/pole/custom/ArmSchema";
import { ArmObjectSchema } from "../../schemas/pole/custom/ArmObjectSchema";
import { PoleTypeSchema } from "../../schemas/pole/standard/PoleTypeSchema";
import { TaperTypeSchema } from "../../schemas/pole/standard/TaperTypeSchema";
import { StandardDirectObjectSchema } from "../../schemas/pole/standard/StandardDirectObjectSchema";

import STANDARD_POLE_DATA from "../../data/specStandardPole.json";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const resolveData = ({
  condition,
  poleTypeStandard,
  taperPoleStandard,
  straightPoleStandard,
  poles,
  directObjects,
  arms,
  overheadWires,
}) => {
  const empty = { poles: [], directObjects: [], arms: [], overheadWires: [] };

  if (condition.poleType !== "standard") {
    return { poles, directObjects, arms, overheadWires };
  }

  const type = poleTypeStandard.type;

  if (type === "taper" || type === "tapered") {
    const isEmbedment =
      condition?.installationPole === "embedment" ||
      condition?.groundPosition === "embedment" ||
      taperPoleStandard?.installationPole === "embedment" ||
      taperPoleStandard?.groundPosition === "embedment";

    const isUnderGL =
      !isEmbedment &&
      (taperPoleStandard?.groundPosition === "underGL" ||
        taperPoleStandard?.groundPosition === "under_gl" ||
        condition?.groundPosition === "under_gl");

    const rawH = Number(taperPoleStandard.height);
    const mHeight = rawH > 100 ? rawH / 1000 : rawH;
    const heightKey = isUnderGL
      ? (mHeight + 0.3).toFixed(1)
      : String(Math.round(mHeight * 10) / 10);

    const dataTaper = STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper;
    const normalizedGroundPos = isUnderGL ? "underGL" : "onGL";
    const group =
      dataTaper?.[taperPoleStandard.poleType]?.[normalizedGroundPos] || {};
    const isTypeWith100 =
      taperPoleStandard.poleType !== "IS" &&
      taperPoleStandard.poleType !== "IA";
    const nominalKey = isTypeWith100
      ? String(Math.round((Number(heightKey) - 0.1) * 10) / 10)
      : String(Math.round((Number(heightKey) + 0.1) * 10) / 10);

    const selectedPole =
      group[heightKey] ||
      group[nominalKey] ||
      group[String(rawH)] ||
      group[String(mHeight)] ||
      group[String(Math.round(mHeight))] ||
      group[(mHeight + 0.3).toFixed(1)] ||
      group[(mHeight + 0.4).toFixed(1)] ||
      Object.values(group)[0] ||
      {};

    if (!selectedPole || Object.keys(selectedPole).length === 0)
      return { error: "Standard taper pole data not found.", ...empty };

    if (isEmbedment) {
      const embLen =
        taperPoleStandard?.embedmentLength ||
        poleConfig?.embedmentLength;
      if (!embLen || isNaN(Number(embLen)) || Number(embLen) <= 0) {
        return {
          error: "Embedment Length is required.",
          poleConfigErrors: { embedmentLength: "Embedment length is required" },
          taperPoleStandardErrors: { embedmentLength: "Embedment length is required" },
          ...empty,
        };
      }
    }

    let resolvedDirectObjects = [];
    let resolvedArms = selectedPole.arms
      ? JSON.parse(JSON.stringify(selectedPole.arms))
      : [];

    // Merge user-edited arms specification when in standard mode with arms
    if (arms && arms.length > 0) {
      if (selectedPole.arms && selectedPole.arms.length > 0) {
        resolvedArms = arms.map((userArm, idx) => {
          const defArm = selectedPole.arms[idx] || selectedPole.arms[0] || {};
          const mergedArm = {
            ...defArm,
            ...userArm,
            idArm: userArm.idArm || String(idx + 1),
            name: userArm.name || defArm.name || `Arm-${idx + 1}`,
            material: userArm.material || defArm.material || "STK400",
            diameter: userArm.diameter ?? defArm.diameter ?? "60.5",
            thickness: userArm.thickness ?? defArm.thickness ?? "3.8",
            length: userArm.length ?? defArm.length ?? "180",
            expLength: userArm.expLength ?? defArm.expLength ?? userArm.length ?? "180",
            zHeight: userArm.zHeight ?? userArm.height ?? defArm.zHeight ?? "4800",
            height: userArm.height ?? userArm.zHeight ?? defArm.height ?? "4800",
            hDistance: userArm.hDistance ?? defArm.hDistance ?? "180",
            fixAngle: userArm.fixAngle ?? defArm.fixAngle ?? "0",
            nnC: userArm.nnC ?? defArm.nnC ?? "0.7",
            quantity: userArm.quantity ?? defArm.quantity ?? "1",
            armObjects:
              Array.isArray(userArm.armObjects) && userArm.armObjects.length > 0
                ? userArm.armObjects.map((userAo, aoIdx) => ({
                    idAo: userAo.idAo || String(aoIdx + 1),
                    name: userAo.name || "灯具",
                    type: userAo.type || "omni",
                    frontArea: userAo.frontArea ?? "0.1",
                    sideArea: userAo.sideArea ?? "",
                    weight: userAo.weight ?? "14",
                    zHeight: userAo.zHeight ?? userAo.hDistance ?? "180",
                    hDistance: userAo.hDistance ?? userAo.zHeight ?? "180",
                    fixAngle: userAo.fixAngle ?? "0",
                    nnC: userAo.nnC ?? "1",
                    quantity: userAo.quantity ?? "1",
                  }))
                : defArm.armObjects || [],
          };
          return mergedArm;
        });
      } else {
        resolvedArms = JSON.parse(JSON.stringify(arms));
      }
    }

    if (directObjects && directObjects.length > 0) {
      directObjects.forEach((obj) => {
        if (obj.sourceType === "direct") {
          resolvedDirectObjects.push({
            ...obj,
            sideArea: obj.sideArea || obj.frontArea || "0.1",
            fixAngle: obj.fixAngle ?? "0",
          });
        } else if (obj.sourceType === "arm") {
          const armIdx = obj.armIndex ?? 0;
          const aoIdx = obj.armObjectIndex ?? 0;
          if (
            resolvedArms[armIdx] &&
            resolvedArms[armIdx].armObjects &&
            resolvedArms[armIdx].armObjects[aoIdx]
          ) {
            resolvedArms[armIdx].armObjects[aoIdx] = {
              ...resolvedArms[armIdx].armObjects[aoIdx],
              name: obj.name,
              type: obj.type,
              frontArea: obj.frontArea,
              sideArea: obj.sideArea || obj.frontArea || "0.1",
              weight: obj.weight,
              zHeight: obj.zHeight,
              nnC: obj.nnC,
              quantity: obj.quantity,
              fixAngle:
                obj.fixAngle ??
                resolvedArms[armIdx].armObjects[aoIdx].fixAngle ??
                "0",
            };
          }
        } else {
          resolvedDirectObjects.push({
            ...obj,
            sideArea: obj.sideArea || obj.frontArea || "0.1",
            fixAngle: obj.fixAngle ?? "0",
          });
        }
      });
    } else {
      resolvedDirectObjects = selectedPole.directObjects || [];
    }

    const resolvedOverheadWires = (overheadWires || []).slice(0, 4);

    return {
      poles: (poles && poles.length > 0) ? poles : (selectedPole.poles || []),
      directObjects: resolvedDirectObjects,
      arms: resolvedArms,
      overheadWires: resolvedOverheadWires,
    };
  }

  if (type === "straight") {
    const key = straightPoleStandard.combination;
    if (!key) return { error: "Please select pole combination.", ...empty };

    const selectedPole = STANDARD_POLE_DATA?.straight?.[key];
    if (!selectedPole)
      return { error: "Standard straight pole data not found.", ...empty };

    const lengths = [
      Number(straightPoleStandard.upperLength || 0),
      Number(straightPoleStandard.lowerLength || 0),
    ];

    const heights = lengths.map((_, i) =>
      lengths.slice(i).reduce((sum, val) => sum + val, 0),
    );

    const resolvedPoles = selectedPole.poles.map((sec, index) => {
      const thickness =
        index === 0
          ? straightPoleStandard.upperThickness
          : straightPoleStandard.lowerThickness;

      return {
        ...sec,
        lowerThickness: thickness,
        upperThickness: thickness,
        zHeight: heights[index],
      };
    });

    return {
      poles: resolvedPoles,
      directObjects: [],
      arms: [],
      overheadWires: [],
    };
  }

  return empty;
};

// ─── MAIN VALIDATOR ───────────────────────────────────────────────────────────
export async function validatePoleForm({
  condition,
  poleTypeStandard,
  taperPoleStandard,
  straightPoleStandard,
  poleConfig,
  poles,
  directObjects,
  overheadWires,
  arms,
}) {
  const isCustom = condition.poleType !== "standard";
  const isStandard = condition.poleType === "standard";
  const isStraight = poleTypeStandard?.type === "straight";

  // ── 1. Structural Design (all modes) ──
  const configSchema =
    typeof PoleConfigSchema === "function"
      ? PoleConfigSchema(condition)
      : PoleConfigSchema;
  const configToValidate = {
    ...poleConfig,
    overdesignFactor: poleConfig?.overdesignFactor || poleConfig?.overDesign,
  };
  const { isValid: isConfigValid, errors: configErrors } = await validateWithYup(
    configSchema,
    configToValidate,
  );

  if (!isConfigValid) {
    return {
      isValid: false,
      poleConfigErrors: configErrors,
      message: "Please correct the errors in Structural Design fields.",
    };
  }

  // ── 2. Pole Type Standard (standard only) ──
  if (isStandard) {
    const { isValid } = await validateWithYup(PoleTypeSchema, poleTypeStandard);
    if (!isValid) {
      return { isValid: false, message: "Please select the pole type first." };
    }
  }

  // ── 3. Taper Pole Standard (standard mode) ──
  if (isStandard) {
    const { isValid, errors } = await validateWithYup(
      TaperTypeSchema(condition),
      taperPoleStandard,
    );

    if (!isValid) {
      return {
        isValid: false,
        taperPoleStandardErrors: errors,
        message: "Please correct the errors in Taper Pole Type Specifications fields.",
      };
    }
  }

  // ── 4. Resolve data source ──
  const resolved = resolveData({
    condition,
    poleTypeStandard,
    taperPoleStandard,
    straightPoleStandard,
    poles,
    directObjects,
    arms,
    overheadWires,
  });

  if (resolved.error) {
    return { isValid: false, message: resolved.error };
  }

  if (isStandard && (!resolved.poles || resolved.poles.length === 0)) {
    return {
      isValid: false,
      message: "Please complete all required standard selections.",
    };
  }

  // ── 5. Validate poles (all modes) ──
  // ── 5a. PoleFormSchema — validasi semua poles, kumpulkan semua error ──
  const allFormErrors = {};
  let hasFormError = false;

  await Promise.all(
    (resolved.poles || []).map(async (pole, index) => {
      const poleKey = pole.id || String(index + 1);
      const poleToValidate = {
        ...pole,
        type: pole.type || pole.poleType || "Straight",
        poleType: pole.poleType || pole.type || "Straight",
      };
      const { isValid, errors } = await validateWithYup(PoleFormSchema, poleToValidate);
      if (!isValid) {
        hasFormError = true;
        // key berdasarkan id pole dan index, value adalah errors per field
        const poleKey = pole.id || String(index + 1);
        allFormErrors[poleKey] = errors;
        if (pole.id) allFormErrors[pole.id] = errors;
        allFormErrors[String(index + 1)] = errors;
      }
    }),
  );

  if (hasFormError) {
    return {
      isValid: false,
      polesErrors: allFormErrors,
      message: "Please correct the errors in Pole Specification fields.",
    };
  }

  // ── 5b. PoleStructuralSchema — validasi array poles sekaligus ──
  const structuralSchema = PoleStructuralSchema(poleConfig);
  const { isValid: isStructuralValid, errors: structuralErrors } =
    await validateWithYup(structuralSchema, resolved.poles);

  if (!isStructuralValid) {
    const groupedErrors = {};

    Object.entries(structuralErrors).forEach(([path, message]) => {
      const match = path.match(/^\[?(\d+)\]?\.(.+)$/);
      if (match) {
        const index = Number(match[1]);
        const field = match[2];
        const pole = resolved.poles[index];
        const poleKey = pole ? (pole.id || String(index + 1)) : String(index + 1);
        if (!groupedErrors[poleKey]) groupedErrors[poleKey] = {};
        // simpan teks error untuk ditampilkan di field & toast
        groupedErrors[poleKey][field] = message || true;
        if (pole?.id) {
          if (!groupedErrors[pole.id]) groupedErrors[pole.id] = {};
          groupedErrors[pole.id][field] = message || true;
        }
        const idxKey = String(index + 1);
        if (!groupedErrors[idxKey]) groupedErrors[idxKey] = {};
        groupedErrors[idxKey][field] = message || true;
      }
    });

    if (Object.keys(groupedErrors).length === 0) {
      const firstMessage = Object.values(structuralErrors)[0];
      return {
        isValid: false,
        polesErrors: {},
        message:
          firstMessage ||
          "Please correct the errors in Pole Specification fields.",
      };
    }

    return {
      isValid: false,
      polesErrors: groupedErrors,
      // Ambil pesan pertama dari structuralErrors untuk toast
      message: Object.values(structuralErrors)[0],
    };
  }

  // ── 6. Validate Objects (custom direct objects OR standard direct objects) ──
  const objectsToValidate =
    directObjects && directObjects.length > 0
      ? directObjects
      : resolved.directObjects || [];

  if (objectsToValidate && objectsToValidate.length > 0) {
    const allDoErrors = {};
    let hasDoError = false;
    const schemaToUse = isCustom
      ? DirectObjectSchema
      : StandardDirectObjectSchema;

    await Promise.all(
      objectsToValidate.map(async (directObject, index) => {
        const { isValid, errors } = await validateWithYup(
          schemaToUse,
          directObject,
        );
        if (!isValid) {
          hasDoError = true;
          const doKey = directObject.idDo || directObject.id || String(index + 1);
          allDoErrors[doKey] = errors;
          if (directObject.idDo) allDoErrors[directObject.idDo] = errors;
          allDoErrors[String(index + 1)] = errors;
        }
      }),
    );

    if (hasDoError) {
      return {
        isValid: false,
        doErrors: allDoErrors,
        message: "Please correct the errors in Object fields.",
      };
    }
  }

  // ── 7. Validate Overhead Wires ──
  const wiresToValidate =
    overheadWires && overheadWires.length > 0
      ? overheadWires
      : resolved.overheadWires || [];

  if (wiresToValidate && wiresToValidate.length > 0) {
    const allOhwErrors = {};
    let hasOhwError = false;

    await Promise.all(
      wiresToValidate.map(async (ohw, index) => {
        const { isValid, errors } = await validateWithYup(
          OverheadWireSchema,
          ohw,
        );
        if (!isValid) {
          hasOhwError = true;
          const ohwKey = ohw.idOhw || ohw.id || String(index + 1);
          allOhwErrors[ohwKey] = errors;
          if (ohw.idOhw) allOhwErrors[ohw.idOhw] = errors;
          allOhwErrors[String(index + 1)] = errors;
        }
      }),
    );

    if (hasOhwError) {
      return {
        isValid: false,
        ohwErrors: allOhwErrors,
        message: "Please correct the errors in Overhead Wire fields.",
      };
    }
  }

  // ── 8. Validate Arms + Arm Objects (all modes with arms) ──
  const armsToValidate =
    arms && arms.length > 0 ? arms : resolved.arms || [];

  if (armsToValidate && armsToValidate.length > 0) {
    const allArmsErrors = {};
    const allAoErrors = {};
    let hasArmError = false;

    await Promise.all(
      armsToValidate.map(async (arm, armIdx) => {
        const normalizedArm = {
          ...arm,
          zHeight: arm.zHeight ?? arm.height,
          height: arm.height ?? arm.zHeight,
        };
        // Validasi arm
        const { isValid, errors } = await validateWithYup(ArmSchema, normalizedArm);
        if (!isValid) {
          hasArmError = true;
          const armKey = arm.idArm || arm.id || String(armIdx + 1);
          allArmsErrors[armKey] = errors;
          if (arm.idArm) allArmsErrors[arm.idArm] = errors;
          allArmsErrors[String(armIdx + 1)] = errors;
        }

        // Validasi semua arm objects dalam arm ini
        await Promise.all(
          (arm.armObjects || []).map(async (ao, aoIdx) => {
            const { isValid: aoValid, errors: aoErrors } =
              await validateWithYup(ArmObjectSchema, ao);
            if (!aoValid) {
              hasArmError = true;
              const aoKey = ao.idAo || ao.id || String(aoIdx + 1);
              allAoErrors[aoKey] = aoErrors;
              if (ao.idAo) allAoErrors[ao.idAo] = aoErrors;
              allAoErrors[String(aoIdx + 1)] = aoErrors;
              allAoErrors[`${arm.idArm || armIdx + 1}_${ao.idAo || aoIdx + 1}`] = aoErrors;
            }
          }),
        );
      }),
    );

    if (hasArmError) {
      const hasArmFieldError = Object.keys(allArmsErrors).length > 0;
      const hasAoFieldError = Object.keys(allAoErrors).length > 0;

      const message =
        hasArmFieldError && hasAoFieldError
          ? "Please correct the errors in Arm and Arm Object fields."
          : hasArmFieldError
            ? "Please correct the errors in Arm Specification fields."
            : "Please correct the errors in Arm Object fields.";

      return {
        isValid: false,
        armsErrors: allArmsErrors,
        aoErrors: allAoErrors,
        message,
      };
    }
  }

  const sanitizedPoles = (resolved.poles || []).map((p) => {
    const isStr = (p.poleType || p.type || "Straight").toLowerCase() === "straight";
    if (isStr) {
      return {
        ...p,
        upperDiameter: p.lowerDiameter ?? p.upperDiameter,
        upperThickness: p.lowerThickness ?? p.upperThickness,
      };
    }
    return p;
  });

  return {
    isValid: true,
    resolvedPoles: sanitizedPoles,
    resolvedDirectObjects: resolved.directObjects,
    resolvedOverheadWires: resolved.overheadWires,
    resolvedArms: resolved.arms,
  };
}

// ─── REPORT VALIDATOR ─────────────────────────────────────────────────────────
export async function validatePoleReport(params) {
  const { results, isCoverComplete } = params;

  if (!results || results.length === 0) {
    return {
      isValid: false,
      message: "No calculation results available. Please calculate first.",
    };
  }

  if (!isCoverComplete()) {
    return {
      isValid: false,
      message: "Please complete the Cover Information fields.",
    };
  }

  return validatePoleForm(params);
}
