type WalletRow = {
  id: string;
  walletProviderName: string;
  walletNumber: string;
  accountName: string | null;
  notes: string | null;
};

type BranchRow = {
  id: string;
  branchCode: string;
  branchName: string;
  walletAccounts: WalletRow[];
};

export function CashierCard({
  storeName,
  merchantCode,
  branch,
}: {
  storeName: string;
  merchantCode: string;
  branch: BranchRow;
}) {
  return (
    <section className="rounded-xl border bg-white p-6 text-black shadow-sm print:break-inside-avoid print:rounded-lg print:border print:p-4 print:shadow-none">
      <header className="mb-4 border-b pb-3 text-right">
        <h1 className="text-2xl font-bold">بطاقة تشغيل</h1>
        <p className="mt-2 text-sm text-gray-600">{storeName}</p>
        <p className="text-sm text-gray-600">رمز التاجر: {merchantCode}</p>
        <p className="text-sm text-gray-600">رمز الفرع: {branch.branchCode}</p>
      </header>

      <div className="space-y-3">
        {branch.walletAccounts.length === 0 ? (
          <p className="rounded-md bg-gray-100 p-3 text-sm">لا توجد محافظ مضافة.</p>
        ) : (
          branch.walletAccounts.map((wallet, index) => (
            <div key={wallet.id} className="rounded-md border p-3 text-sm">
              <p className="font-semibold">
                {index + 1}. {wallet.walletProviderName}
              </p>
              <p className="mt-1">رقم المحفظة: {wallet.walletNumber}</p>
              {wallet.accountName ? <p>اسم الحساب: {wallet.accountName}</p> : null}
              {wallet.notes ? <p>ملاحظة: {wallet.notes}</p> : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export const CashierCardTemplate = CashierCard;
