<%
/*
 * Copyright (c) 2013-2016 LabKey Corporation
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
<%@ taglib prefix="labkey" uri="http://www.labkey.org/taglib" %>
<%@ page import="org.apache.commons.io.FileUtils" %>
<%@ page import="org.labkey.api.util.PageFlowUtil" %>
<%@ page import="org.labkey.api.view.ActionURL" %>
<%@ page import="org.labkey.targetedms.TargetedMSController" %>
<%@ page import="org.labkey.targetedms.TargetedMSManager" %>
<%@ page import="org.labkey.targetedms.TargetedMSModule" %>
<%@ page import="org.labkey.targetedms.chromlib.ChromatogramLibraryUtils" %>
<%@ page import="java.io.File" %>
<%@ page import="java.util.Date" %>
<%@ page import="org.labkey.api.data.Container" %>
<%@ page import="org.labkey.api.util.DateUtil" %>
<%@ page extends="org.labkey.api.jsp.JspBase" %>
<%
    Container c = getContainer();
    TargetedMSModule.FolderType folderType = TargetedMSManager.getFolderType(c);

    boolean isLibrary = ( folderType == TargetedMSModule.FolderType.Library ||
                          folderType == TargetedMSModule.FolderType.LibraryProtein );

    int currentRevision = ChromatogramLibraryUtils.getCurrentRevision(c, getUser());
%>

<table class="labkey-data-region-legacy labkey-show-borders">
<tr>
    <th>Revision #</th>
    <th>File name</th>
    <th>Size</th>
    <th>Date created</th>
</tr>
        <%
    for (int i=1; i <= currentRevision; i++)
    {
        ActionURL u = new ActionURL(TargetedMSController.DownloadChromLibraryAction.class, c);
        u.addParameter("revision", i);
        File archiveFile = ChromatogramLibraryUtils.getChromLibFile(c, i);
        if (archiveFile.isFile()) {
%>
    <tr>
        <td><%= i %></td>
        <td><%= PageFlowUtil.textLink(ChromatogramLibraryUtils.getDownloadFileName(c, i), u) %></td>
        <td><%= h(FileUtils.byteCountToDisplaySize(archiveFile.length())) %></td>
        <td><%= formatDateTime(new Date(archiveFile.lastModified()))%></td>
    </tr>
<%
        }
        else
        {
%><tr>
    <td><%= i %></td>
    <td><%= h(ChromatogramLibraryUtils.getDownloadFileName(c, i)) %></td>
    <td>unavailable</td>
    <td></td>
</tr><%
        }
    }
%>