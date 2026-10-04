import { Loader } from "@/components/loader";

export default function Loading() {
  return (
    <main className="grid min-h-svh place-items-center">
      <Loader label="Menyiapkan halaman" />
    </main>
  );
}
