# data.gov.hk Integration Guide for IdeaFactory Strategist

## Overview
**Site:** https://data.gov.hk  
**Total Datasets:** 5,700+  
**API-Enabled:** 2,500+ datasets  
**Data Providers:** 120 government agencies

---

## 🎯 Recommended Links by Evaluation Stage

### 1. **Market Sizing & Competitive Landscape**

| Dataset | Use Case | Link |
|---------|----------|------|
| **HKSTPC Company Directory** | Tech ecosystem mapping, competitor research | https://data.gov.hk/en-data/dataset/hkstp-hkstp-hkstp-company-directory |
| **Newly Incorporated Companies (2024+)** | Market entry trends, new competitors | https://data.gov.hk/en-data/dataset/hk-cr-crdata-list-newly-registered-companies-2526 |
| **Hong Kong Standard Industrial Classification (HSIC)** | Industry codes, TAM estimation | https://data.gov.hk/en-data/dataset/hk-censtatd-tablechart-b2xx0021 |
| **Consumer Price Index (Monthly)** | Market conditions, pricing assumptions | https://data.gov.hk/en-data/dataset/hk-censtatd-tablechart-b1060001 |
| **Online Price Watch** | Consumer behavior, price sensitivity | https://data.gov.hk/en-data/dataset/cc-pricewatch-pricewatch |

### 2. **Workforce & Talent Availability**

| Dataset | Use Case | Link |
|---------|----------|------|
| **Labour Force Statistics (210-06101)** | Total workforce size, trends | https://data.gov.hk/en-data/dataset/hk-censtatd-tablechart-210-06101 |
| **Persons Engaged & Vacancies (215-16002)** | Hiring difficulty by industry, vacancy rates | https://data.gov.hk/en-data/dataset/hk-censtatd-tablechart-215-16002 |
| **Wage & Payroll Statistics (Quarterly)** | Salary benchmarks, cost assumptions | https://data.gov.hk/en-data/dataset/hk-censtatd-tablechart-b1050009 |
| **Annual Earnings & Hours Survey** | Compensation data by role | https://data.gov.hk/en-data/dataset/hk-censtatd-tablechart-b1050014 |
| **Unemployment Rate by Age & Sex (210-06103)** | Talent pool demographics | https://data.gov.hk/en-data/dataset/hk-censtatd-tablechart-210-06103 |

### 3. **Economic & Regulatory Conditions**

| Dataset | Use Case | Link |
|---------|----------|------|
| **HKMA Interest Rates (Daily)** | Economic cycle, funding cost assumptions | https://data.gov.hk/en-data/dataset/hk-hkma-t06-t060303hk-interbank-ir-daily |
| **Business Registration Fee & Levy Table** | Regulatory cost assumptions | https://data.gov.hk/en-data/dataset/hk-ird-ird_json-br-fee-n-levy |
| **Tax Rate Table (Salaries/Personal Assessment)** | Cost modeling, salary assumptions | https://data.gov.hk/en-data/dataset/hk-ird-ird_json-tax-rate |
| **Government Financial Statistics** | Macro economic indicators | https://data.gov.hk/en-data/dataset/hk-fstb-tsyb-financial-statistics |

### 4. **Specialized / Domain-Specific**

| Dataset | Use Case | Link |
|---------|----------|------|
| **Intellectual Property Trading Survey (2024)** | IP startup viability | https://data.gov.hk/en-data/dataset/hk-ipd-ipstat-survey-of-profession-business-sevices-in-ip-tradingcomnmercilisation |
| **Registered Electrical Contractors/Workers** | Hardware/tech compliance | https://data.gov.hk/en-data/dataset/hk-emsd-emsd1-registered-electrical-contractors |
| **HKAS Accredited Laboratories** | Quality assurance/biotech viability | https://data.gov.hk/en-data/dataset/hk-itc-hkas-cab-hoklas |
| **Trusted Retailers (No Fakes Pledge)** | E-commerce/retail ecosystem | https://data.gov.hk/en-data/dataset/hk-ipd-ipstat-no-fakes-pledge-participating-retailers |

---

## 📊 How to Use in Idea Scoring

### For **Viability** scoring (0-10):
1. **Check workforce availability** → Use Table 215-16002 (vacancies by industry)
2. **Validate salary assumptions** → Use Wage & Payroll Statistics
3. **Assess market entry costs** → Use Business Registration Fee table
4. **Check competitor density** → Use HKSTPC Company Directory + new company registrations

### For **Market/Vision** scoring (0-10):
1. **Size TAM** → Use HSIC to find comparable industry revenue data
2. **Check market trends** → Use Consumer Price Index + newly registered companies
3. **Validate user willingness to pay** → Use Online Price Watch data

### For **Speed-to-Market** scoring (0-10):
1. **Assess talent pool speed** → Use Labour Force Statistics + vacancy rates
2. **Check regulatory timeline** → Use Business Registration process + tax rules
3. **Monitor economic conditions** → Use HKMA interest rates (funding availability)

---

## 🔗 Quick Access Links

**All Datasets:** https://data.gov.hk/en-datasets/  
**Search:** https://data.gov.hk/en-datasets/search  
**API Documentation:** https://data.gov.hk/en-data-guides  
**Contact:** enquiry@1835500.gov.hk | 1835500

---

## Integration Notes for Paperclip Agents

- **API Format:** Most popular datasets support JSON, CSV, and XML formats
- **Real-time Updates:** Some datasets (e.g., company registrations, job vacancies) update daily
- **Search-friendly:** data.gov.hk supports keyword search across all 5,700+ datasets
- **Complementary Data:** Combine with GitHub ecosystem data (Build Monitor) and Slack signals (team sentiment) for holistic evaluation

---

## Example: Evaluating PawMind (GitHub Copilot)

**What data.gov.hk tells us:**
- **Market:** HKSTPC Company Directory shows [X] existing AI/ML companies in HK; new registrations up [Y]% YoY
- **Workforce:** Table 215-16002 shows [Z] tech industry vacancies; Wage Stats confirm HK software engineer salary = $$$
- **Economic:** HKMA rates at [R]%, making venture funding accessible; Consumer Price Index stable
- **Speed:** Business registration time ~[T] days; regulatory burden = low

**Scoring Impact:**  
→ Viability +1.5 (feasibility of hiring, cost validation)  
→ Market/Vision +0.8 (TAM confirmed via industry data)  
→ Speed-to-Market +1.0 (talent + regulatory ease)  
**Result:** Composite score shifts from 6.2 → ~7.5 with data.gov.hk insights
