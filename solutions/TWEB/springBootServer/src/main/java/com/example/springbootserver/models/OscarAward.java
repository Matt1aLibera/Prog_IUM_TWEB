package com.example.springbootserver.models;

import jakarta.persistence.*;

@Entity
@Table(name = "oscar_awards")
public class OscarAward {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "year_film", nullable = false)
    private Integer yearFilm;

    @Column(name = "year_ceremony", nullable = false)
    private Integer yearCeremony;

    @Column(nullable = false)
    private Integer ceremony;

    @Column(nullable = false, length = 200)
    private String category;

    @Column(nullable = false, length = 1000)
    private String name;

    @Column(nullable = false, length = 1000)
    private String film;

    @Column(nullable = false)
    private Boolean winner;

    // Costruttori
    public OscarAward() {}

    public OscarAward(Integer yearFilm, Integer yearCeremony, Integer ceremony,
                      String category, String name, String film, Boolean winner) {
        this.yearFilm = yearFilm;
        this.yearCeremony = yearCeremony;
        this.ceremony = ceremony;
        this.category = category;
        this.name = name;
        this.film = film;
        this.winner = winner;
    }

    // Getter e Setter
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getYearFilm() { return yearFilm; }
    public void setYearFilm(Integer yearFilm) { this.yearFilm = yearFilm; }
    public Integer getYearCeremony() { return yearCeremony; }
    public void setYearCeremony(Integer yearCeremony) { this.yearCeremony = yearCeremony; }
    public Integer getCeremony() { return ceremony; }
    public void setCeremony(Integer ceremony) { this.ceremony = ceremony; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFilm() { return film; }
    public void setFilm(String film) { this.film = film; }
    public Boolean getWinner() { return winner; }
    public void setWinner(Boolean winner) { this.winner = winner; }
}