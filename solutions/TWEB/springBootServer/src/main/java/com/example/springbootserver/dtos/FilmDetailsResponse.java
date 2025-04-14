package com.example.springbootserver.dtos;

import com.example.springbootserver.models.*;

import java.util.List;

// FilmDetailsResponse.java
public class FilmDetailsResponse {
    private Movie movie;
    private Poster poster;
    private List<ActorAppearance> actors;
    private List<Country> countries;
    private List<Genre> genres;
    private List<Language> languages;
    private List<Studio> studios;
    private List<Theme> themes;
    private List<Crew> crew;
    private List<Release> release;

    public FilmDetailsResponse(Movie movie, Poster poster, List<ActorAppearance> actors, List<Country> countries, List<Genre> genres, List<Language> languages, List<Studio> studios, List<Theme> themes, List<Crew> crew, List<Release> release) {
        this.movie = movie;
        this.poster = poster;
        this.actors = actors;
        this.countries = countries;
        this.genres = genres;
        this.languages = languages;
        this.studios = studios;
        this.themes = themes;
        this.crew = crew;
        this.release = release;
    }

    public Movie getMovie() {
        return movie;
    }

    public void setMovie(Movie movie) {
        this.movie = movie;
    }

    public Poster getPoster() {
        return poster;
    }

    public void setPoster(Poster poster) {
        this.poster = poster;
    }

    public List<ActorAppearance> getActors() {
        return actors;
    }

    public void setActors(List<ActorAppearance> actors) {
        this.actors = actors;
    }

    public List<Country> getCountries() {
        return countries;
    }

    public void setCountries(List<Country> countries) {
        this.countries = countries;
    }

    public List<Genre> getGenres() {
        return genres;
    }

    public void setGenres(List<Genre> genres) {
        this.genres = genres;
    }

    public List<Language> getLanguages() {
        return languages;
    }

    public void setLanguages(List<Language> languages) {
        this.languages = languages;
    }

    public List<Studio> getStudios() {
        return studios;
    }

    public void setStudios(List<Studio> studios) {
        this.studios = studios;
    }

    public List<Theme> getThemes() {
        return themes;
    }

    public void setThemes(List<Theme> themes) {
        this.themes = themes;
    }

    public List<Crew> getCrew() {
        return crew;
    }

    public void setCrew(List<Crew> crew) {
        this.crew = crew;
    }

    public List<Release> getRelease() {
        return release;
    }

    public void setRelease(List<Release> release) {
        this.release = release;
    }

    public FilmDetailsResponse() {

    }
}
