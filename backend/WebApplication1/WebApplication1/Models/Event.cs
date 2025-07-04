﻿using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebApplication1.Models;

public class Event
{
    public int Id { get; set; }
    public byte[] Photo { get; set; } = Array.Empty<byte>();
    public string Title { get; set; }
    public string Description { get; set; }
    public string Tags { get; set; }
    
    public int Likes { get; set; }
    
    [ForeignKey("Company")]
    public int CompanyId { get; set; }
    
    public Company Company { get; set; }
}