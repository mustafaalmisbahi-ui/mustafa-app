type Props = {
  merchant: {
    id: string;
    storeName: string;
    merchantCode: string;
    branches: {
      id: string;
      branchName: string;
      branchCode: string;
      walletAccounts: {
        id: string;
        walletProviderName: string;
        walletNumber: string;
      }[];
    }[];
  };
};

export function MerchantSignage({ merchant }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-white p-8 text-right print:max-w-none print:border-none print:p-0 print:shadow-none">
      <header className="mb-8 text-center print:mb-5">
        <h1 className="text-3xl font-bold">وسائل الدفع المتاحة</h1>
        <p className="mt-3 text-xl text-slate-700">{merchant.storeName}</p>
        <div className="mt-4 flex justify-center gap-3 text-sm text-slate-600">
          <span>رمز التاجر: {merchant.merchantCode}</span>
        </div>
      </header>

      <div className="space-y-5 print:space-y-3">
        {merchant.branches.map((branch) => (
          <section
            key={branch.id}
            className="rounded-xl border p-4 break-inside-avoid print:rounded-lg print:p-3"
          >
            <div className="mb-3 flex items-center justify-between print:mb-2">
              <h2 className="text-lg font-semibold">{branch.branchName}</h2>
              <span className="text-sm text-slate-500">{branch.branchCode}</span>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:gap-2">
              {branch.walletAccounts.length > 0 ? (
                branch.walletAccounts.map((wallet) => (
                  <li key={wallet.id} className="rounded-lg border bg-slate-50 p-3 print:p-2">
                    <p className="font-medium">{wallet.walletProviderName}</p>
                    <p className="text-lg tracking-wide">{wallet.walletNumber}</p>
                  </li>
                ))
              ) : (
                <li className="rounded-lg border bg-slate-50 p-3 text-slate-500">
                  لا توجد محافظ مضافة
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
