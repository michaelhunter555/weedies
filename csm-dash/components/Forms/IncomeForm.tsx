import React, { useEffect } from "react";

import InputField from "@/components/Shared/Inputs/InputField";
import { useInvalidateQuery } from "@/hooks/invalidate-query";
import { useForm } from "@/hooks/useForm";
import { useTransaction } from "@/hooks/useTransaction";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid2";
import { useMutation } from "@tanstack/react-query";

const initialFormData = {
  totalAmount: { value: 0, isValid: false },
  category: { value: "General", isValid: true },
  cogs: { value: 0, isValid: false },
  processingFees: { value: 0, isValid: false },
  comment: { value: "", isValid: true },
};
const IncomeForm = () => {
  const { invalidateQuery } = useInvalidateQuery();
  const { addIncome } = useTransaction();
  const [formState, inputHandler, setFormData] = useForm(
    initialFormData,
    false
  );
  const mutation = useMutation({
    mutationFn: addIncome,
    onSuccess: (data) => {
      invalidateQuery("transactions");
    },
    onError: (error) => {
      console.log(error);
    },
  });

  useEffect(() => {
    if (
      formState?.inputs?.totalAmount?.value &&
      formState?.inputs?.category?.value &&
      formState?.inputs?.cogs?.value &&
      formState?.inputs?.processingFees?.value &&
      formState?.isValid
    ) {
      setFormData(
        {
          totalAmount: {
            value: formState?.inputs?.totalAmount?.value,
            isValid: true,
          },
          category: {
            value: formState?.inputs?.category?.value,
            isValid: true,
          },
          cogs: { value: formState?.inputs?.cogs?.value, isValid: true },
          processingFees: {
            value: formState?.inputs?.processingFees?.value,
            isValid: true,
          },
          comment: { value: formState?.inputs?.comment?.value, isValid: true },
        },
        true
      );
    }
  }, [
    formState?.inputs?.totalAmount?.value,
    formState?.inputs?.category?.value,
    formState?.inputs?.cogs?.value,
    formState?.inputs?.processingFees?.value,
    formState?.inputs?.comment?.value,
    formState?.isValid,
    setFormData,
  ]);

  const handleSubmitIncomeForm = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const formData = {
      totalAmount: Number(formState?.inputs?.totalAmount?.value),
      category: String(formState?.inputs?.category?.value),
      cogs: Number(formState?.inputs?.cogs?.value),
      processingFees: Number(formState?.inputs?.processingFees?.value),
      comment: String(formState?.inputs?.comment?.value),
    };
    console.log(formData);
    mutation.mutate({ ...formData });

    setFormData(
      {
        totalAmount: { value: 0, isValid: false },
        category: { value: "General", isValid: true },
        cogs: { value: 0, isValid: false },
        processingFees: { value: 0, isValid: false },
        comment: { value: "", isValid: true },
      },
      false
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmitIncomeForm}>
      <Grid container direction="column" spacing={1}>
        <Grid size={12}>
          <InputField
            title="What was the total amount?"
            helperText="enter total amount ($usd)"
            id="totalAmount"
            name="totalAmount"
            type="number"
            value={Number(formState?.inputs?.totalAmount?.value) || 0}
            hasAdornment={true}
            inputHandler={inputHandler}
          />
        </Grid>

        <Grid size={12}>
          <InputField
            title="Select Category?"
            helperText="select category or add one"
            id="category"
            name="category"
            type="text"
            value={formState?.inputs?.category?.value}
            hasAdornment={false}
            inputHandler={inputHandler}
          />
        </Grid>
        <Grid size={12}>
          <InputField
            title="Cost of Goods Sold"
            helperText="enter COGS ($usd)"
            id="cogs"
            name="cogs"
            type="number"
            value={formState?.inputs?.cogs?.value}
            hasAdornment={true}
            inputHandler={inputHandler}
          />
        </Grid>

        <Grid size={12}>
          <InputField
            title="Processing Fees"
            helperText="enter processing fees ($usd)"
            id="processingFees"
            name="processingFees"
            type="number"
            value={formState?.inputs?.processingFees?.value}
            hasAdornment={true}
            inputHandler={inputHandler}
          />
        </Grid>
        <Grid size={12}>
          <InputField
            title="Description"
            helperText="add notes for future reference"
            id="comment"
            name="comment"
            type="text"
            value={formState?.inputs?.comment?.value}
            hasAdornment={false}
            inputHandler={inputHandler}
          />
        </Grid>
      </Grid>

      <Button type="submit" variant="outlined" disabled={!formState?.isValid}>
        Submit data
      </Button>
    </Box>
  );
};

export default IncomeForm;
