package com.example.springbootserver.dtos;

import com.example.springbootserver.models.*;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(
        name = "FilmDetailsResponse",
        description = "Complete movie details with all related entities including actors, genres, crew, etc."
)
public class FilmDetailsResponse {
    @Schema(
            description = "Main movie information",
            requiredMode = Schema.RequiredMode.REQUIRED,
            implementation = Movie.class
    )
    private Movie movie;
    @Schema(
            description = "Movie poster information including URL",
            nullable = true
    )
    private Poster poster;
    @ArraySchema(
            arraySchema = @Schema(
                    description = "List of actors and their appearances in the movie"
            ),
            schema = @Schema(implementation = ActorAppearance.class)
    )
    private List<ActorAppearance> actors;
    @ArraySchema(
            arraySchema = @Schema(
                    description = "Countries associated with the movie production"
            ),
            schema = @Schema(implementation = Country.class)
    )
    private List<Country> countries;
    @ArraySchema(
            minItems = 1,
            arraySchema = @Schema(
                    description = "Genres categorizing the movie"),
            schema = @Schema(implementation = Genre.class)
    )
    private List<Genre> genres;
    @ArraySchema(
            minItems = 1,
            arraySchema = @Schema(
                    description = "Languages available for the movie"),
            schema = @Schema(implementation = Language.class)
    )
    private List<Language> languages;
    @ArraySchema(
            arraySchema = @Schema(
                    description = "Studios involved in movie production"
            ),
            schema = @Schema(implementation = Studio.class)
    )
    private List<Studio> studios;
    @ArraySchema(
            arraySchema = @Schema(
                    description = "Thematic elements of the movie"
            ),
            schema = @Schema(implementation = Theme.class)
    )
    private List<Theme> themes;

    @ArraySchema(
            arraySchema = @Schema(
                    description = "Crew members involved in production"
            ),
            schema = @Schema(implementation = Crew.class)
    )
    private List<Crew> crew;
    @ArraySchema(
            arraySchema = @Schema(
                    description = "Release dates by country"
            ),
            schema = @Schema(implementation = Release.class)
    )
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
