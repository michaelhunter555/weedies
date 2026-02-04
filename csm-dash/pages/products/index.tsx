"use client";
import { Box, Button,Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TableFooter, Stack } from "@mui/material";
import router from "next/router";

export default function ProductsPage() {
  return (
    <>
        <Stack width="100%" direction="row" justifyContent="flex-end" mb={2}>
            <Button size="small" variant="contained" color="primary" onClick={() => router.push("/products/add-product")}>Add Product</Button>
        </Stack>
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Stock</TableCell>
            <TableCell>Inventory</TableCell>
            <TableCell>Edit</TableCell>
          </TableRow>
        </TableHead>
      </Table>
      <TableBody>
        <TableRow>
          <TableCell>Product 1</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
        </TableRow>
      </TableFooter>
    </TableContainer>
    </>
  );
}