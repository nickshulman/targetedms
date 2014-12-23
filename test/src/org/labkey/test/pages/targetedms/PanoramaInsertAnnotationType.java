/*
 * Copyright (c) 2014 LabKey Corporation
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
package org.labkey.test.pages.targetedms;

import org.labkey.test.BaseWebDriverTest;
import org.labkey.test.Locator;
import org.labkey.test.components.InsertPage;

public class PanoramaInsertAnnotationType extends InsertPage
{
    private static final String DEFAULT_TITLE = "Insert qcannotation";

    public PanoramaInsertAnnotationType(BaseWebDriverTest test)
    {
        super(test, DEFAULT_TITLE);
    }

    public void insert(String name, String description, String color)
    {
        Elements elements = elements();
        _test.setFormElement(elements.name, name);
        _test.setFormElement(elements.description, description);
        _test.setFormElement(elements.color, color);
        _test.clickAndWait(elements.submit);
    }

    @Override
    protected Elements elements()
    {
        return new Elements();
    }

    private class Elements extends InsertPage.Elements
    {
        public Locator.XPathLocator name = body.append(Locator.tagWithName("input", "quf_Name"));
        public Locator.XPathLocator description = body.append(Locator.tagWithName("textarea", "quf_Description"));
        public Locator.XPathLocator color = body.append(Locator.tagWithName("input", "quf_Color"));
    }
}