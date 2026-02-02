import React, { useEffect } from "react";

import InputField from "@/components/Shared/Inputs/InputField";
import { useInvalidateQuery } from "@/hooks/invalidate-query";
import { useForm } from "@/hooks/useForm";
import { useTransaction } from "@/hooks/useTransaction";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid2";
import { useMutation } from "@tanstack/react-query";

const ExpenseForm = () => {
  const { addExpense } = useTransaction();
  const { invalidateQuery } = useInvalidateQuery();
  const [formState, inputHandler, setFormData] = useForm(
    {
      initialAmount: { value: 0, isValid: false },
      category: { value: "General", isValid: true },
      comment: { value: "", isValid: true },
    },
    false
  );
  const mutation = useMutation({
    mutationFn: addExpense,
    onSuccess: (data) => {
      invalidateQuery("transactions");
    },
    onError: (error) => {
      console.log(error);
    },
  });

  useEffect(() => {
    if (
      formState?.inputs?.initialAmount?.value &&
      formState?.inputs?.category?.value &&
      formState?.isValid
    ) {
      setFormData(
        {
          initialAmount: {
            value: formState?.inputs?.initialAmount?.value,
            isValid: true,
          },
          category: {
            value: formState?.inputs?.category?.value,
            isValid: true,
          },
          comment: { value: formState?.inputs?.comment?.value, isValid: true },
        },
        true
      );
    }
  }, [
    formState?.inputs?.initialAmount?.value,
    formState?.inputs?.category?.value,
    formState?.inputs?.comment?.value,
    formState?.isValid,
    setFormData,
  ]);

  const handleSubmitIncomeForm = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const formData = {
      initialAmount: Number(formState?.inputs?.initialAmount?.value),
      category: String(formState?.inputs?.category?.value),
      comment: String(formState?.inputs?.comment?.value),
    };
    mutation.mutate({ ...formData });

    setFormData(
      {
        initialAmount: {
          value: formState?.inputs?.initialAmount?.value,
          isValid: true,
        },
        category: {
          value: formState?.inputs?.category?.value,
          isValid: true,
        },
        comment: { value: formState?.inputs?.comment?.value, isValid: true },
      },
      false
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmitIncomeForm}>
      <Grid container direction="column" spacing={1}>
        <Grid size={12}>
          <InputField
            title="What is the initial amount?"
            helperText="enter total amount ($usd)"
            id="initialAmount"
            name="initialAmount"
            type="number"
            defaultValue={formState?.inputs?.initialAmount?.value}
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
            defaultValue={formState?.inputs?.category?.value}
            hasAdornment={false}
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
            defaultValue={formState?.inputs?.comment?.value}
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

export default ExpenseForm;
