package com.example.springbootserver.models;
import jakarta.persistence.*;

@Entity
@Table
public class Movie {
    @Id
    private Long id; // ID originale dal CSV (es. 1000001)

    @Column(nullable = false, length = 500) // Aumentato a 500 caratteri
    private String name;

    private Integer date;
    @Column(length = 500)
    private String tagline;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer minute; // Rinominato da 'minute' a 'minutes' per convenzione

    // Costruttore vuoto obbligatorio
    public Movie() {
    }

    // Costruttore con parametri (senza rating)
    public Movie(Long id, String name, Integer date, String tagline,
                 String description, Integer minute) {
        this.id = id;
        this.name = name;
        this.date = date;
        this.tagline = tagline;
        this.description = description;
        this.minute = minute;
    }

    // GETTER e SETTER (rimosso rating)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getDate() { return date; }
    public void setDate(Integer year) { this.date = year; }
    public String getTagline() { return tagline; }
    public void setTagline(String tagline) { this.tagline = tagline; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getMinute() { return minute; }
    public void setMinute(Integer minute) { this.minute = minute; }
}
