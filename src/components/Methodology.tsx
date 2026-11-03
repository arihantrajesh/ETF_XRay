import katex from 'katex'

const K = ({ tex, block = false }: { tex: string; block?: boolean }) => (
  <span dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { displayMode: block, throwOnError: false }) }} />
)

export default function Methodology() {
  return (
    <div className="stack prose">
      <section className="card">
        <h3>How ETF X-Ray works</h3>
        <p>
          Let <K tex="w_i" /> be the share of your portfolio in ETF <K tex="i" /> and <K tex="h_{ij}" /> the weight of stock <K tex="j" /> inside that ETF.
          All of the numbers below are computed in your browser from static JSON files of ETF holdings.
        </p>
        <h4>1. True exposure to each stock</h4>
        <K block tex="E_j = \sum_i w_i \, h_{ij}" />
        <p>This powers the look-through table: one row per underlying stock, with each fund’s contribution <K tex="w_i h_{ij}" />.</p>
        <h4>2. Pairwise overlap</h4>
        <K block tex="\text{Overlap}(A,B) = \sum_j \min(h_{Aj},\, h_{Bj})" />
        <p>The share of one fund’s portfolio you could rebuild from the other. 0% means no shared holdings; 100% means identical funds.</p>
        <h4>3. Concentration and effective holdings</h4>
        <K block tex="\text{HHI} = \sum_j E_j^2, \qquad N_{\text{eff}} = \frac{1}{\text{HHI}}" />
        <p>
          <K tex="N_{\text{eff}}" /> is the number of equal-sized stocks that would be exactly as concentrated as your portfolio. It is computed over
          listed stocks with <K tex="E_j" /> re-normalised to sum to 1, so bonds and cash do not distort it. Share classes (e.g. GOOGL and GOOG) are
          counted separately.
        </p>
        <h4>4. Diversification score (0–100)</h4>
        <ul>
          <li><b>35 pts, effective breadth:</b> <K tex="35\cdot\min\!\big(1,\ \ln N_{\text{eff}} / \ln 60\big)" /></li>
          <li><b>20 pts, largest stock:</b> full marks at ≤ 3% of the portfolio, zero at ≥ 10%</li>
          <li><b>15 pts, top-10 share:</b> full marks at ≤ 25%, zero at ≥ 55%</li>
          <li><b>20 pts, sector tilt:</b> half the sum of absolute sector differences vs. VTI; full marks at 0, zero at ≥ 35 points</li>
          <li><b>10 pts, fund redundancy:</b> weighted average pair overlap; full marks at 0%, zero at ≥ 60%</li>
        </ul>
        <p>Bands: 80+ well diversified · 60–79 moderate · 40–59 concentrated · below 40 highly concentrated. The cut-offs are judgment calls, chosen so a total-market fund scores in the “well diversified” band; they are a teaching device, not an industry standard.</p>
        <h4>5. Sector exposure</h4>
        <p>Your sector weights are <K tex="\sum_i w_i s_{i,k}" /> using each fund’s reported sector weights <K tex="s_{i,k}" />, compared with VTI as the total-market benchmark. Anything a fund does not classify (typically bonds) shows as “bonds / other”.</p>
        <h4>6. Fee drag</h4>
        <p>With weighted expense ratio <K tex="r = \sum_i w_i r_i" />, gross return <K tex="g" />, starting balance <K tex="P" /> and level year-end contributions <K tex="C" />:</p>
        <K block tex="V_T(x) = P(1+x)^T + C\,\frac{(1+x)^T - 1}{x}, \qquad \text{Fee drag} = V_T(g) - V_T(g - r)" />
        <p>
          The “cost of overlap” applies the same formula to <K tex="r \cdot D" />, where <K tex="D = \dfrac{\sum_j \big(E_j - \max_i w_i h_{ij}\big)}{\sum_j E_j}" /> is the share of exposure held through more than one fund beyond its largest holder. It is an illustration, not a forecast.
        </p>
        <h4>7. Alerts</h4>
        <p>Four thresholds you control (single stock, top-10, sector, fund-pair overlap) are re-checked on every change; new alerts also appear as toasts. A scheduled job refreshes the underlying data daily.</p>
      </section>
      <section className="card">
        <h3>Data and limits</h3>
        <ul>
          <li>Source: Alpha Vantage <code>ETF_PROFILE</code> (holdings, sector weights, expense ratio). The browser never calls the API; a scheduled script writes static JSON, each stamped with an “as of” date.</li>
          <li>Each fund keeps at most its 1,000 largest holdings. The Data tab shows the exact coverage per fund; partial coverage understates overlap and concentration.</li>
          <li>Holdings of bond funds are individual bonds, so they rarely overlap with stocks and are excluded from N<sub>eff</sub>.</li>
          <li>Sector weights are fund-level, as reported by the data vendor; the vendor’s classification can differ from other providers.</li>
        </ul>
      </section>
    </div>
  )
}
