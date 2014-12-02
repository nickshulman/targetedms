<%
/*
 * Copyright (c) 2012-2013 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
%>
<%@ page import="org.labkey.api.data.Container" %>
<%@ page import="org.labkey.api.security.permissions.UpdatePermission" %>
<%@ page import="org.labkey.api.view.ActionURL" %>
<%@ page import="org.labkey.api.view.HttpView" %>
<%@ page import="org.labkey.api.view.JspView" %>
<%@ page import="org.labkey.targetedms.TargetedMSController" %>
<%@ page import="org.labkey.targetedms.TargetedMSRun" %>
<%@ page import="java.text.DecimalFormat" %>
<%@ page extends="org.labkey.api.jsp.JspBase" %>
<%
    JspView<TargetedMSController.RunDetailsBean> me = (JspView<TargetedMSController.RunDetailsBean>) HttpView.currentView();
    TargetedMSController.RunDetailsBean bean = me.getModelBean();
    ActionURL downloadAction = new ActionURL(TargetedMSController.DownloadDocumentAction.class, getContainer());
    downloadAction.addParameter("runId", bean.getRun().getId());
    TargetedMSRun run = bean.getRun();
    Container c = getContainer();
    DecimalFormat decimalFormat = new DecimalFormat("#,###");
%>

<table>
    <tr>
        <td class="labkey-form-label">Name</td>
        <td>
            <%= h(bean.getRun().getDescription())%>
            <%= textLink("Download", downloadAction)%>
        </td>
    </tr>
    <tr>
        <td class="labkey-form-label">Protein Count</td>
        <td><%= h(decimalFormat.format(bean.getRun().getPeptideGroupCount())) %></td>

        <td class="labkey-form-label">Peptide Count</td>
        <td><%= h(decimalFormat.format(bean.getRun().getPeptideCount())) %></td>
    </tr>
    <tr>
        <td class="labkey-form-label">Precursor Count</td>
        <td><%= h(decimalFormat.format(bean.getRun().getPrecursorCount())) %></td>

        <td class="labkey-form-label">Transition Count</td>
        <td><%= h(decimalFormat.format(bean.getRun().getTransitionCount())) %></td>
    </tr>

    <tr><td colspan="4">
        <div>
            <%
             if (c.hasPermission(getUser(), UpdatePermission.class))
             { %>
                 <%=textLink("Rename", TargetedMSController.getRenameRunURL(c, run, getActionURL()))%> <%
             } %>
        </div>
    </td></tr>
</table>