/*
 * Copyright (c) 2006-2015 LabKey Corporation
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

package org.labkey.bootstrap;

import org.apache.catalina.loader.WebappClassLoader;

import javax.naming.NamingException;
import javax.naming.directory.DirContext;
import java.io.File;
import java.net.URL;
import java.net.MalformedURLException;
import java.util.List;
import java.util.Collection;

/**
 * User: jeckels
 * Date: Jun 8, 2006
 */
public class LabkeyServerBootstrapClassLoader extends WebappClassLoader
{
    private final SimpleLogger _log = new CommonsLogger(LabkeyServerBootstrapClassLoader.class);

    // On startup on some platforms, some modules will die if java.awt.headless is not set to false.
    // Only set this if the user hasn't overridden it
    static
    {
        String headless = "java.awt.headless";
        if (System.getProperty(headless) == null)
            System.setProperty(headless, "true");
        // On most installs, catalina.home and catalina.base point to the same directory. However, it's possible
        // to have multiple instances share the Tomcat binaries but have their own ./logs, ./conf, etc directories
        // Thus, we want to use catalina.base for our place to find log files. http://www.jguru.com/faq/view.jsp?EID=1121565
        PipelineBootstrapConfig.ensureLogHomeSet(System.getProperty("catalina.base") + "/logs");
    }

    private ModuleExtractor _moduleExtractor;

    public LabkeyServerBootstrapClassLoader()
    {
        super();
    }

    public LabkeyServerBootstrapClassLoader(ClassLoader parent)
    {
        super(parent);
    }

    /**
     * This method is accessed via reflection from within the main webapp.
     * Do not rename or remove it without updating its usage in ModuleLoader.
     * @return all the module files that should be used
     */
    @SuppressWarnings({"UnusedDeclaration"})
    public List<File> getExplodedModuleDirectories()
    {
        return _moduleExtractor.getExplodedModuleDirectories();
    }
    
    protected void clearReferences()
    {
    }

    public void setResources(DirContext resources)
    {
        super.setResources(resources);
        try
        {
            File webappDir = new File(resources.getNameInNamespace());

            _moduleExtractor = new ModuleExtractor(webappDir, new CommonsLogger(ModuleExtractor.class));
            Collection<ExplodedModule> explodedModules = _moduleExtractor.extractModules();
            for(ExplodedModule exploded : explodedModules)
            {
                for(URL jarFileUrl : exploded.getJarFileUrls())
                {
                    addURL(jarFileUrl);
                }
            }
        }
        catch(NamingException | MalformedURLException e)
        {
            throw new RuntimeException(e);
        }
    }

    public boolean modified()
    {
        boolean modified = false;
        if (super.modified())
        {
            _log.info("Standard Tomcat modification check indicates webapp restart is required. Likely an updated JAR file in WEB-INF/lib.");
            modified = true;
        }
        modified |= _moduleExtractor.areModulesModified();

        // On production servers, don't automatically redeploy the web app, which causes Tomcat to leak memory
        return Boolean.getBoolean("devmode") && modified;
    }
}