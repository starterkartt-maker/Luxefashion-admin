import { supabase } from "../supabase";

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(name),
      collection:collections(name),
      variants:product_variants(id, stock)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string) {
  // 1. Fetch variant IDs for this product to remove related order_items
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", id);

  const variantIds = variants?.map((v) => v.id) || [];

  // 2. Delete order_items first as they may refer to this product or its variants
  if (variantIds.length > 0) {
    await supabase.from("order_items").delete().in("variant_id", variantIds);
  }
  await supabase.from("order_items").delete().eq("product_id", id);

  // 3. Delete reviews that references this product
  await supabase.from("reviews").delete().eq("product_id", id);

  // 4. Delete product_images that references this product
  await supabase.from("product_images").delete().eq("product_id", id);

  // 5. Delete product_variants that references this product
  await supabase.from("product_variants").delete().eq("product_id", id);

  // 6. Finally delete the product from products table
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function updateProductStatus(id: string, updates: any) {
  const { error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}
