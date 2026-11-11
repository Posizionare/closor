"use client";
import * as React from "react";
import { Input, type InputProps } from "./input";
import { maskCpfCnpj, maskPhone, maskCurrencyBRL } from "@/lib/masks";

type Mask = "cpfcnpj" | "phone" | "currency";

export interface MaskedInputProps extends Omit<InputProps, "onChange" | "defaultValue"> {
  mask: Mask;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const fns: Record<Mask, (v: string) => string> = {
  cpfcnpj: maskCpfCnpj,
  phone: maskPhone,
  currency: maskCurrencyBRL,
};

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, defaultValue, onChange, ...rest }, ref) => {
    const fn = fns[mask];
    const initial = defaultValue == null ? "" :
      mask === "currency"
        ? Number(defaultValue).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : fn(String(defaultValue));
    const [value, setValue] = React.useState(initial);

    return (
      <Input
        ref={ref}
        {...rest}
        value={value}
        onChange={(e) => {
          const v = fn(e.target.value);
          e.target.value = v;
          setValue(v);
          onChange?.(e);
        }}
      />
    );
  },
);
MaskedInput.displayName = "MaskedInput";
