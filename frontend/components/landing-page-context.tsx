'use client'

import React from 'react'
import { useTheme } from 'next-themes'

export type LandingTheme = 'dark' | 'light'
export type LandingLanguage = 'en' | 'ar'

export const landingCopy = {
    en: {
        controls: {
            themeLight: 'Light',
            themeDark: 'Dark',
            language: 'العربية',
        },
        nav: {
            howItWorks: 'How it works',
            features: 'Features',
            useCases: 'Use cases',
            contact: 'Contact',
            waitlist: 'Join waitlist',
            docs: 'Docs',
        },
        hero: {
            badge: 'Join the waitlist | Get early access to the alpha',
            titleStart: 'Your AI coworker agent for',
            titleAccent: 'business workflows',
            subtitle: 'Connect your apps, describe the work, and let Atmet automate repeatable tasks across your business.',
            waitlist: 'Join waitlist',
            openApp: 'Open app',
        },
        logoCloud: {
            prefix: 'Atmet connects the tools modern teams already use across',
            operations: 'Operations',
            finance: 'Finance',
            engineering: 'Engineering',
            sales: 'Sale',
            marketing: 'Marketing',
            more: 'More',
        },
        how: {
            eyebrow: 'How it works',
            title: 'Automate the work that slows teams down',
            description: 'Atmet learns your apps, tasks, and approvals so your team can delegate repeatable work without losing control.',
            steps: [
                {
                    title: '1. Connect your apps',
                    description: <>Bring your <span className="text-foreground font-medium">business tools</span> into one AI workspace.</>,
                },
                {
                    title: '2. Describe the workflow',
                    description: 'Tell Atmet what needs to happen, who approves it, and when it should run.',
                },
                {
                    title: '3. Let the agent execute',
                    description: 'Review sensitive steps and get a clear trail of every completed action.',
                },
            ],
        },
        platform: {
            eyebrow: 'Platform',
            title: 'A control center for AI-run workflows',
            description: 'Give teams one place to connect apps, define automation, monitor progress, and approve the moments that matter.',
            skillsTitle: 'Skills library',
            skillsDescription: 'Choose a ready-made skill for common work, or create your own skill when your team needs a custom agent capability.',
            modelTitle: 'Choose your model',
            modelDescription: 'Pick the AI model that fits each workflow, from fast daily automation to deeper reasoning tasks.',
            memoryTitle: 'Workspace memory',
            memoryDescription: 'Keep decisions, files, app context, and team preferences attached so agents remember how your business works.',
            automationTitle: 'Full automation, 24/7',
            automationDescription: 'Let agents monitor triggers, run recurring workflows, and complete routine work around the clock.',
        },
        stats: {
            visibility: 'Operational visibility',
            visibilityText: 'across connected workflows.',
            always: 'Always-on agents',
            alwaysText: 'ready for scheduled business work.',
            repeatable: '12X',
            repeatableText: 'more repeatable workflows with less manual handoff.',
        },
        cta: {
            title: 'Put your workflow on',
            accent: 'AI autopilot',
            subtitle: 'Join the early access list and help shape the Atmet alpha for real business automation.',
            button: 'Join waitlist',
        },
        footer: {
            description: 'Atmet is an AI coworker agent that automates repeatable business workflows across your tools.',
            product: 'Product',
            access: 'Access',
            community: 'Community',
            platform: 'Platform',
            results: 'Results',
            openApp: 'Open app',
            signIn: 'Sign in',
            rights: 'All rights reserved',
            earlyAccess: 'Early access open',
        },
        heroPreview: {
            search: 'Search',
            workspace: 'Atmet Core',
            workspaceSub: 'Alpha workspace',
            title: 'New Project',
            run: 'Run',
            greeting: 'What are we building today?',
            placeholder: 'Tell Atmet what to automate, connect, or build...',
            model: 'Atmet',
            attach: 'Attach',
            files: 'Files',
            image: 'Image',
            chats: 'Chats',
            chatItems: ['Invoice collection agent', 'Weekly sales summary', 'Support escalation flow'],
            suggestions: ['Create a follow-up agent', 'Analyze overdue invoices', 'Draft customer replies'],
            sidebarItems: ['Build Project', 'Agents', 'Skills', 'Apps'],
            tabs: ['Build agent', 'Run workflow', 'Connect apps', 'Review output'],
        },
        illustrations: {
            integrationsTitle: 'Integrations',
            integrations: [
                ['Gmail', 'Connect inbox messages and email workflows.'],
                ['GitHub', 'Track issues, pull requests, and repos.'],
                ['Instagram', 'Manage social content and audience signals.'],
                ['Google Sheets', 'Sync spreadsheet data and approvals.'],
            ],
            request: 'When a renewal invoice is 14 days overdue, check the customer health score in HubSpot, summarize the latest email thread, create a follow-up task for the account owner, and ask me to approve the reminder before sending it with',
            suggestions: '3 suggestions',
            navigate: 'to navigate',
            workflow: 'Renewal follow-up',
            query: 'Detect overdue invoice',
            queryText: 'Watch finance triggers',
            context: 'Check customer context',
            contextText: 'Pull CRM and email history',
            response: 'Draft next action',
            responseText: 'Prepare reminder and task',
            output: 'Request approval',
            outputText: 'Send after manager review',
            pending: 'Pending',
            skillSearch: 'Best skills for operations workflows',
            skillResults: [
                ['Invoice follow-up agent', 'From finance-skills.json'],
                ['CRM enrichment workflow', 'From hubspot-playbook.fig'],
                ['Weekly reporting assistant', 'From reports-library.docx'],
            ],
            memoryTitle: 'Atmet Memory',
            memoryActive: 'Active',
            memoryWindow: 'Context Window',
            memorySynced: 'Workspace context synced',
            remembered: 'Remembered Context',
            memories: ['Remember approval rules for renewals', 'Attach CRM notes to support workflows', 'Use finance team as invoice approvers'],
            memoriesActive: '3 memories active',
        },
    },
    ar: {
        controls: {
            themeLight: 'فاتح',
            themeDark: 'داكن',
            language: 'English',
        },
        nav: {
            howItWorks: 'كيف يعمل',
            features: 'المزايا',
            useCases: 'حالات الاستخدام',
            contact: 'تواصل',
            waitlist: 'انضم للقائمة',
            docs: 'المستندات',
        },
        hero: {
            badge: 'انضم للقائمة | احصل على وصول مبكر لنسخة ألفا',
            titleStart: 'أتمت يؤتمت شغلك كامل،',
            titleAccent: 'ابنِ وكيـل ذكاء إصطناعي لأي مجال',
            subtitle: 'اربط تطبيقاتك، صف العمل المطلوب، ودع أتمت يؤتمت المهام المتكررة عبر شركتك.',
            waitlist: 'انضم للقائمة',
            openApp: 'افتح التطبيق',
        },
        logoCloud: {
            prefix: 'يربط أتمت الأدوات التي تستخدمها الفرق الحديثة في',
            operations: 'العمليات',
            finance: 'المالية',
            engineering: 'الهندسة',
            sales: 'المبيعات',
            marketing: 'التسويق',
            more: 'المزيد',
        },
        how: {
            eyebrow: 'كيف يعمل',
            title: 'أتمتة العمل الذي يبطئ الفرق',
            description: 'يتعلم أتمت تطبيقاتك ومهامك والموافقات المطلوبة حتى يفوض فريقك العمل المتكرر بدون فقدان التحكم.',
            steps: [
                {
                    title: '١. اربط تطبيقاتك',
                    description: <>اجمع <span className="text-foreground font-medium">أدوات عملك</span> داخل مساحة ذكاء اصطناعي واحدة.</>,
                },
                {
                    title: '٢. صف سير العمل',
                    description: 'اخبر أتمت بما يجب أن يحدث، ومن يوافق عليه، ومتى يجب تشغيله.',
                },
                {
                    title: '٣. دع الوكيل ينفذ',
                    description: 'راجع الخطوات الحساسة واحصل على سجل واضح لكل إجراء مكتمل.',
                },
            ],
        },
        platform: {
            eyebrow: 'المنصة',
            title: 'مركز تحكم لسير العمل المدعوم بالذكاء الاصطناعي',
            description: 'مكان واحد للفرق لربط التطبيقات، تعريف الأتمتة، مراقبة التقدم، والموافقة على اللحظات المهمة.',
            skillsTitle: 'مكتبة المهارات',
            skillsDescription: 'اختر مهارة جاهزة للعمل الشائع، أو أنشئ مهارة خاصة عندما يحتاج فريقك قدرة مخصصة للوكيل.',
            modelTitle: 'اختر النموذج',
            modelDescription: 'اختر نموذج الذكاء الاصطناعي المناسب لكل سير عمل، من الأتمتة اليومية السريعة إلى مهام التفكير العميق.',
            memoryTitle: 'ذاكرة مساحة العمل',
            memoryDescription: 'احتفظ بالقرارات والملفات وسياق التطبيقات وتفضيلات الفريق حتى يتذكر الوكلاء طريقة عمل شركتك.',
            automationTitle: 'أتمتة كاملة على مدار الساعة',
            automationDescription: 'دع الوكلاء يراقبون المحفزات، يشغلون سير العمل المتكرر، وينجزون العمل الروتيني طوال الوقت.',
        },
        stats: {
            visibility: 'رؤية تشغيلية',
            visibilityText: 'عبر سير العمل المتصل.',
            always: 'وكلاء يعملون دائمًا',
            alwaysText: 'جاهزون للعمل التجاري المجدول.',
            repeatable: '١٢x',
            repeatableText: 'سير عمل متكرر أكثر مع تسليم يدوي أقل.',
        },
        cta: {
            title: 'ضع سير عملك على',
            accent: 'القيادة التلقائية بالذكاء الاصطناعي',
            subtitle: 'انضم لقائمة الوصول المبكر وساعد في تشكيل نسخة أتمت Alpha لأتمتة الأعمال الحقيقية.',
            button: 'انضم للقائمة',
        },
        footer: {
            description: 'أتمت وكيل ذكاء اصطناعي ينجز معك ويؤتمت سير العمل التجاري المتكرر عبر أدواتك.',
            product: 'المنتج',
            access: 'الوصول',
            community: 'المجتمع',
            platform: 'المنصة',
            results: 'النتائج',
            openApp: 'افتح التطبيق',
            signIn: 'تسجيل الدخول',
            rights: 'جميع الحقوق محفوظة',
            earlyAccess: 'الوصول المبكر متاح',
        },
        heroPreview: {
            search: 'بحث',
            workspace: 'أتمت Core',
            workspaceSub: 'مساحة Alpha',
            title: 'مشروع جديد',
            run: 'تشغيل',
            greeting: 'ماذا سنبني اليوم؟',
            placeholder: 'اكتب لـ أتمت ما تريد أتمتته أو ربطه أو بناؤه...',
            model: 'أتمت',
            attach: 'إرفاق',
            files: 'ملفات',
            image: 'صورة',
            chats: 'المحادثات',
            chatItems: ['وكيل تحصيل الفواتير', 'ملخص المبيعات الأسبوعي', 'تدفق تصعيد الدعم'],
            suggestions: ['أنشئ وكيل متابعة', 'حلل الفواتير المتأخرة', 'اكتب ردود العملاء'],
            sidebarItems: ['بناء مشروع', 'الوكلاء', 'المهارات', 'التطبيقات'],
            tabs: ['بناء وكيل', 'تشغيل سير العمل', 'ربط التطبيقات', 'مراجعة المخرجات'],
        },
        illustrations: {
            integrationsTitle: 'التكاملات',
            integrations: [
                ['Gmail', 'اربط رسائل البريد وسير العمل.'],
                ['GitHub', 'تابع المشاكل وطلبات الدمج والمستودعات.'],
                ['Instagram', 'أدر المحتوى الاجتماعي وإشارات الجمهور.'],
                ['Google Sheets', 'زامن بيانات الجداول والموافقات.'],
            ],
            request: 'عندما تتأخر فاتورة تجديد لمدة ١٤ يومًا، تحقق من درجة صحة العميل في HubSpot، لخّص آخر محادثة بريدية، أنشئ مهمة متابعة لصاحب الحساب، واطلب موافقتي قبل إرسال التذكير مع',
            suggestions: '٣ اقتراحات',
            navigate: 'للتنقل',
            workflow: 'متابعة التجديد',
            query: 'اكتشاف فاتورة متأخرة',
            queryText: 'مراقبة محفزات المالية',
            context: 'فحص سياق العميل',
            contextText: 'جلب CRM وسجل البريد',
            response: 'صياغة الإجراء التالي',
            responseText: 'تحضير التذكير والمهمة',
            output: 'طلب الموافقة',
            outputText: 'الإرسال بعد مراجعة المدير',
            pending: 'قيد الانتظار',
            skillSearch: 'أفضل المهارات لسير عمل العمليات',
            skillResults: [
                ['وكيل متابعة الفواتير', 'من finance-skills.json'],
                ['سير إثراء بيانات CRM', 'من hubspot-playbook.fig'],
                ['مساعد التقارير الأسبوعية', 'من reports-library.docx'],
            ],
            memoryTitle: 'ذاكرة أتمت',
            memoryActive: 'نشطة',
            memoryWindow: 'نافذة السياق',
            memorySynced: 'تمت مزامنة سياق المساحة',
            remembered: 'السياق المحفوظ',
            memories: ['تذكر قواعد الموافقة للتجديدات', 'إرفاق ملاحظات CRM بسير الدعم', 'استخدم فريق المالية كموافقين للفواتير'],
            memoriesActive: '٣ ذكريات نشطة',
        },
    },
} as const

type LandingCopy = (typeof landingCopy)[LandingLanguage]

type LandingContextValue = {
    theme: LandingTheme
    language: LandingLanguage
    dir: 'ltr' | 'rtl'
    t: LandingCopy
    toggleTheme: () => void
    toggleLanguage: () => void
}

const LandingPageContext = React.createContext<LandingContextValue | null>(null)

export function LandingPageProvider({ children }: { children: React.ReactNode }) {
    const { setTheme: setRootTheme } = useTheme()
    const [theme, setLandingTheme] = React.useState<LandingTheme>('dark')
    const [language, setLanguage] = React.useState<LandingLanguage>('en')

    React.useEffect(() => {
        const storedTheme = window.localStorage.getItem('atmet-landing-theme')
        const storedLanguage = window.localStorage.getItem('atmet-landing-language')

        if (storedTheme === 'dark' || storedTheme === 'light') {
            setLandingTheme(storedTheme)
            setRootTheme(storedTheme)
        }

        if (storedLanguage === 'en' || storedLanguage === 'ar') {
            setLanguage(storedLanguage)
        }
    }, [])

    React.useEffect(() => {
        window.localStorage.setItem('atmet-landing-theme', theme)
        setRootTheme(theme)
    }, [setRootTheme, theme])

    const toggleTheme = React.useCallback(() => {
        setLandingTheme((current) => (current === 'dark' ? 'light' : 'dark'))
    }, [])

    React.useEffect(() => {
        window.localStorage.setItem('atmet-landing-language', language)
    }, [language])

    const value = React.useMemo<LandingContextValue>(
        () => ({
            theme,
            language,
            dir: language === 'ar' ? 'rtl' : 'ltr',
            t: landingCopy[language],
            toggleTheme,
            toggleLanguage: () => setLanguage((current) => (current === 'en' ? 'ar' : 'en')),
        }),
        [language, theme, toggleTheme]
    )

    return <LandingPageContext.Provider value={value}>{children}</LandingPageContext.Provider>
}

export function useLandingPage() {
    const context = React.useContext(LandingPageContext)

    if (!context) {
        throw new Error('useLandingPage must be used inside LandingPageProvider')
    }

    return context
}
