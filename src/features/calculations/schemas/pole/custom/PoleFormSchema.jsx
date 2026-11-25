import * as yup from "yup";

const toNumber = (_, val) =>
  val === "" || val === null ? undefined : Number(val);

export const PoleFormSchema = yup.object({
  name: yup.string().required("Required field"),

  zHeight: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .min(0, "Must be positive"),

  quantity: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .integer("Must be a whole number")
    .min(1, "Value must be greater than 0"),

  lowerDiameter: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .min(1, "Must be greater than 0"),

  upperDiameter: yup
    .number()
    .transform(toNumber)
    .when(["type", "poleType"], {
      is: (type, poleType) =>
        (type || poleType || "").toLowerCase() === "taper",
      then: (schema) =>
        schema
          .typeError("Must be a number")
          .required("Required field")
          .min(1, "Must be greater than 0"),
      otherwise: (schema) => schema.notRequired(),
    }),

  lowerThickness: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .min(0.1, "Must be greater than 0"),

  upperThickness: yup
    .number()
    .transform(toNumber)
    .when(["type", "poleType"], {
      is: (type, poleType) =>
        (type || poleType || "").toLowerCase() === "taper",
      then: (schema) =>
        schema
          .typeError("Must be a number")
          .required("Required field")
          .min(0.1, "Must be greater than 0"),
      otherwise: (schema) => schema.notRequired(),
    }),
});
