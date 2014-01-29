package org.labkey.targetedms.model;

import org.labkey.api.data.Container;

/**
 * User: vsharma
 * Date: 2/18/13
 * Time: 3:42 PM
 */
public class ExperimentAnnotations
{
    private int _id;
    protected Container _container;
    private String _title;
    private String _experimentDescription;
    private String _sampleDescription;
    private String _organism;
    private String _instrument;
    private Boolean _spikeIn;
    private String _citation;
    private String _abstract;
    private String _publicationLink;

    public int getId()
    {
        return _id;
    }

    public void setId(int id)
    {
        _id = id;
    }

    public Container getContainer()
    {
        return _container;
    }

    public void setContainer(Container container)
    {
        _container = container;
    }

    public String getTitle()
    {
        return _title;
    }

    public void setTitle(String title)
    {
        _title = title;
    }

    public String getExperimentDescription()
    {
        return _experimentDescription;
    }

    public void setExperimentDescription(String experimentDescription)
    {
        _experimentDescription = experimentDescription;
    }

    public String getSampleDescription()
    {
        return _sampleDescription;
    }

    public void setSampleDescription(String sampleDescription)
    {
        _sampleDescription = sampleDescription;
    }

    public String getOrganism()
    {
        return _organism;
    }

    public void setOrganism(String organism)
    {
        _organism = organism;
    }

    public String getInstrument()
    {
        return _instrument;
    }

    public void setInstrument(String instrument)
    {
        _instrument = instrument;
    }

    public String getCitation()
    {
        return _citation;
    }

    public Boolean getSpikeIn()
    {
        return _spikeIn;
    }

    public void setSpikeIn(Boolean spikeIn)
    {
        _spikeIn = spikeIn;
    }

    public void setCitation(String citation)
    {
        _citation = citation;
    }

    public String getAbstract()
    {
        return _abstract;
    }

    public void setAbstract(String anAbstract)
    {
        _abstract = anAbstract;
    }

    public String getPublicationLink()
    {
        return _publicationLink;
    }

    public void setPublicationLink(String publicationLink)
    {
        _publicationLink = publicationLink;
    }
}