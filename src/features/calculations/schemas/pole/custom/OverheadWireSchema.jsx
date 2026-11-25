import * as yup from "yup";

const toNumber = (_, val) =>
  val === "" || val === null ? undefined : Number(val);

export const OverheadWireSchema = yup.object({
  name: yup.string().required("Required field"),

  diameter: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .min(0.001, "Value must be greater than 0"),

  zHeight: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .min(0, "Must be positive"),

  weight: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .min(0.0001, "Value must be greater than 0"),

  span: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .min(0.001, "Value must be greater than 0"),

  saggingRatio: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .min(0, "Must be positive"),

  nnC: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field")
    .min(0, "Must be positive"),

  fixAngle: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field"),

  verticalAngle: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .required("Required field"),

  tension: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .nullable()
    .optional(),

  angle: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .nullable()
    .optional(),

  quantity: yup
    .number()
    .transform(toNumber)
    .typeError("Must be a number")
    .nullable()
    .optional(),
});
