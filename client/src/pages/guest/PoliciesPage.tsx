import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FileText, ShieldCheck, ChevronRight } from 'lucide-react';
import { policyService, type PolicyItem } from '../../api/services/policy.service';
import { ROUTES } from '../../constants/routes';

const CATEGORY_LABELS: Record<string, string> = {
  WARRANTY: 'Bảo hành',
  RETURN: 'Đổi trả & Hoàn tiền',
  SHIPPING: 'Vận chuyển & Giao nhận',
  PAYMENT: 'Thanh toán & Trả góp',
  PRIVACY: 'Bảo mật thông tin',
  TERMS: 'Điều khoản sử dụng',
  GENERAL: 'Quy định chung',
};

export const PoliciesPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [activePolicy, setActivePolicy] = useState<PolicyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const list = await policyService.getPublicPolicies();
        if (!mounted) return;
        setPolicies(list);

        if (slug) {
          const matched = list.find((p) => p.slug === slug);
          if (matched) {
            setActivePolicy(matched);
          } else {
            try {
              const single = await policyService.getPublicPolicyBySlug(slug);
              if (mounted) setActivePolicy(single);
            } catch {
              if (mounted) {
                setActivePolicy(list[0] || null);
                setErrorMsg('Không tìm thấy chính sách theo đường dẫn yêu cầu.');
              }
            }
          }
        } else if (list.length > 0) {
          setActivePolicy(list[0]);
        }
      } catch {
        if (mounted) setErrorMsg('Không thể tải dữ liệu chính sách từ hệ thống.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <Link to={ROUTES.HOME} className="hover:text-blue-600 transition">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={ROUTES.POLICIES} className="hover:text-blue-600 transition">
          Chính sách & Điều khoản
        </Link>
        {activePolicy && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-800 truncate">{activePolicy.title}</span>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar danh sách chính sách */}
        <aside className="lg:col-span-4 space-y-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Danh mục Chính sách
              </h2>
            </div>

            {loading && policies.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">Đang tải...</div>
            ) : policies.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">Chưa có chính sách nào được công bố.</div>
            ) : (
              <div className="space-y-1.5">
                {policies.map((item) => {
                  const isSelected = activePolicy?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/policies/${item.slug}`)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold'
                          : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4 mt-0.5 shrink-0 opacity-75" />
                      <div className="min-w-0">
                        <div className="text-xs leading-snug">{item.title}</div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Nội dung chính sách */}
        <section className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs min-h-[420px]">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">Đang tải nội dung chính sách...</div>
            ) : !activePolicy ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Hiện chưa có nội dung chính sách hiển thị.
              </div>
            ) : (
              <article className="space-y-4">
                <div className="pb-4 border-b border-slate-100">
                  <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                    {CATEGORY_LABELS[activePolicy.category] || activePolicy.category}
                  </span>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {activePolicy.title}
                  </h1>
                  {activePolicy.summary && (
                    <p className="text-sm text-slate-600 mt-2">{activePolicy.summary}</p>
                  )}
                </div>

                <div
                  className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700"
                  dangerouslySetInnerHTML={{ __html: activePolicy.content || '' }}
                />
              </article>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PoliciesPage;

