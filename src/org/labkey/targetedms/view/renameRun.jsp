<%
/*
 * Copyright (c) 2013-2019 LabKey Corporation
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
<%@ page import="org.labkey.api.view.HttpView" %>
<%@ page import="org.labkey.api.view.JspView" %>
<%@ page import="org.labkey.targetedms.TargetedMSController" %>
<%@ taglib prefix="labkey" uri="http://www.labkey.org/taglib" %>
<%@ page extends="org.labkey.api.jsp.JspBase" %>
<%
    TargetedMSController.RenameBean bean = ((JspView<TargetedMSController.RenameBean>) HttpView.currentView()).getModelBean();
%>
<labkey:form action="<%=h(buildURL(TargetedMSController.RenameRunAction.class))%>" method="post" layout="horizontal">
<%=generateReturnUrlFormField(bean.returnURL)%>
    <labkey:input type="hidden" name="run" value="<%=bean.run.getRunId()%>"/>
    <labkey:input type="text" size="70" name="description" id="description" label="Name" value="<%=h(bean.description)%>"/>
    <%= button("Rename").submit(true) %> <%= button("Cancel").href(bean.returnURL) %>
</labkey:form>