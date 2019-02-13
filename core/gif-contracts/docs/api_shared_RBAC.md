---
id: shared_RBAC
title: RBAC
---

<div class="contract-doc"><div class="contract"><h2 class="contract-header"><span class="contract-kind">contract</span> RBAC</h2><div class="source">Source: <a href="/blob/v1.0.0/contracts/shared/RBAC.sol" target="_blank">shared/RBAC.sol</a></div></div><div class="index"><h2>Index</h2><ul><li><a href="shared_RBAC.html#addRoleToAccount">addRoleToAccount</a></li><li><a href="shared_RBAC.html#cleanRolesForAccount">cleanRolesForAccount</a></li><li><a href="shared_RBAC.html#createRole">createRole</a></li><li><a href="shared_RBAC.html#hasRole">hasRole</a></li><li><a href="shared_RBAC.html#onlyWithRole">onlyWithRole</a></li></ul></div><div class="reference"><h2>Reference</h2><div class="modifiers"><h3>Modifiers</h3><ul><li><div class="item modifier"><span id="onlyWithRole" class="anchor-marker"></span><h4 class="name">onlyWithRole</h4><div class="body"><code class="signature">modifier <strong>onlyWithRole</strong><span>(bytes32 _role) </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_role</code> - bytes32</div></dd></dl></div></div></li></ul></div><div class="functions"><h3>Functions</h3><ul><li><div class="item function"><span id="addRoleToAccount" class="anchor-marker"></span><h4 class="name">addRoleToAccount</h4><div class="body"><code class="signature">function <strong>addRoleToAccount</strong><span>(address _address, bytes32 _role) </span><span>public </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_address</code> - address</div><div><code>_role</code> - bytes32</div></dd></dl></div></div></li><li><div class="item function"><span id="cleanRolesForAccount" class="anchor-marker"></span><h4 class="name">cleanRolesForAccount</h4><div class="body"><code class="signature">function <strong>cleanRolesForAccount</strong><span>(address _address) </span><span>public </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_address</code> - address</div></dd></dl></div></div></li><li><div class="item function"><span id="createRole" class="anchor-marker"></span><h4 class="name">createRole</h4><div class="body"><code class="signature">function <strong>createRole</strong><span>(bytes32 _role) </span><span>public </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_role</code> - bytes32</div></dd></dl></div></div></li><li><div class="item function"><span id="hasRole" class="anchor-marker"></span><h4 class="name">hasRole</h4><div class="body"><code class="signature">function <strong>hasRole</strong><span>(address _address, bytes32 _role) </span><span>public </span><span>view </span><span>returns  (bool) </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_address</code> - address</div><div><code>_role</code> - bytes32</div></dd><dt><span class="label-return">Returns:</span></dt><dd>bool</dd></dl></div></div></li></ul></div></div></div>